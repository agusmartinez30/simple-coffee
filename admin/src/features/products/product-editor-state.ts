import type { ConsumptionMomentId, OptionSelection, Product, ProductCategoryId } from "@/mocks/service-day";
import {
  PRODUCT_STATUS_LABELS,
  createProductId,
  createProductSku,
  getNextCommercialRank,
  getProductStatus,
  upsertProduct,
  type ProductCategoryOption,
  type ProductStatus,
} from "./product-catalog";
import {
  applyProductDraft,
  createEmptyDraft,
  getOptionGroupMeta,
  getPreviewModel,
  getProductChanges,
  hasFormErrors,
  toProductDraft,
  validateProductDraft,
  type OptionDraft,
  type OptionGroupDraft,
  type PreviewModel,
  type ProductDraft,
  type ProductFormErrors,
  type SaveMode,
} from "./product-form";
import { toFormErrors, toProductBody, type ProductBody, type ProductIssue } from "./products-mapper";
import type { ProductsState } from "./products-state";

/** The 07B editor of one product (or of a new one). */
export type EditorState = {
  /** null while creating a product that was never saved. */
  productId: string | null;
  /** The product as last saved, in form shape, to tell what changed. */
  saved: ProductDraft;
  draft: ProductDraft;
  /** Mode of the last blocked save: its errors stay visible until a save succeeds or the draft is discarded. */
  attemptedMode: SaveMode | null;
  /** Option row in edit mode (pencil), if any. */
  editingOptionId: string | null;
  /** Group whose title is being edited, if any (a new group opens in edit mode). */
  editingGroupId: string | null;
  /** Next "opcion-N" id for added options. */
  nextOptionNumber: number;
  /** Next "grupo-N" id for added groups. */
  nextGroupNumber: number;
  /** A save is waiting for the API. */
  saving: boolean;
  /** Field messages of the API's last rejection; cleared by the next edit. */
  serverErrors: ProductFormErrors | null;
  /** The API's last save failed without field errors ("No se pudo guardar"); cleared by the next edit. */
  saveError: string | null;
};

export type EditorAction =
  | { type: "open-editor"; id: string }
  | { type: "open-new" }
  | { type: "close-editor" }
  | { type: "open-preview" }
  | { type: "close-preview" }
  | { type: "set-field"; field: "name" | "description" | "price"; value: string }
  | { type: "set-category"; categoryId: ProductCategoryId }
  | { type: "toggle-moment"; moment: ConsumptionMomentId }
  | { type: "set-draft-availability"; available: boolean }
  | { type: "set-draft-publication"; published: boolean }
  | { type: "set-customer-notes"; allow: boolean }
  | { type: "set-image"; image: string | undefined }
  | { type: "add-group" }
  | { type: "edit-group"; groupId: string }
  | { type: "finish-group-edit" }
  | { type: "rename-group"; groupId: string; title: string }
  | { type: "remove-group"; groupId: string }
  | { type: "set-group-selection"; groupId: string; selection: OptionSelection }
  | { type: "set-group-required"; groupId: string; required: boolean }
  | { type: "set-group-max"; groupId: string; max: number | undefined }
  | { type: "set-default-option"; groupId: string; optionId: string }
  | { type: "add-option"; groupId: string }
  | { type: "edit-option"; id: string }
  | { type: "finish-option-edit" }
  | { type: "update-option"; groupId: string; id: string; changes: Partial<Omit<OptionDraft, "id">> }
  | { type: "remove-option"; groupId: string; id: string }
  | { type: "save"; mode: SaveMode }
  /** API saves: the container sends `getSaveRequest` and reports the answer. */
  | { type: "save-started" }
  | { type: "save-succeeded"; product: Product; mode: SaveMode }
  | { type: "save-failed"; issues: readonly ProductIssue[] }
  | { type: "discard" };

export const BLOCKED_SAVE_MESSAGE = "Revisá los campos marcados antes de guardar.";
export const FAILED_SAVE_MESSAGE = "No se pudo guardar el producto. Intentá de nuevo.";

function openEditor(productId: string | null, draft: ProductDraft): EditorState {
  return {
    productId,
    saved: draft,
    draft,
    attemptedMode: null,
    editingOptionId: null,
    editingGroupId: null,
    nextOptionNumber: 1,
    nextGroupNumber: 1,
    saving: false,
    serverErrors: null,
    saveError: null,
  };
}

function withDraft(state: ProductsState, editor: EditorState, changes: Partial<ProductDraft>): ProductsState {
  return {
    ...state,
    editor: { ...editor, draft: { ...editor.draft, ...changes }, serverErrors: null, saveError: null },
  };
}

/** The draft with one group changed by `update`. */
function withGroup(
  state: ProductsState,
  editor: EditorState,
  groupId: string,
  update: (group: OptionGroupDraft) => OptionGroupDraft,
): ProductsState {
  return withDraft(state, editor, {
    optionGroups: editor.draft.optionGroups.map((group) => (group.id === groupId ? update(group) : group)),
  });
}

/** A product that was never saved; the draft is applied over it. It lists last by relevance. */
function newProductBase(draft: ProductDraft, products: readonly Product[]): Product {
  const categoryId = draft.categoryId || "cafes";
  return {
    id: createProductId(
      draft.name,
      products.map((product) => product.id),
    ),
    sku: createProductSku(
      categoryId,
      products.map((product) => product.sku),
    ),
    commercialRank: getNextCommercialRank(products),
    name: "",
    price: 0,
    categoryId,
    description: "",
    moments: [],
    publication: "draft",
    available: true,
    archived: false,
    allowCustomerNotes: true,
    optionGroups: [],
  };
}

function otherProductNames(state: ProductsState, editor: EditorState): string[] {
  return state.products
    .filter((product) => !product.archived && product.id !== editor.productId)
    .map((product) => product.name);
}

/** The product a valid draft saves as, or null when the form blocks the save. */
function savedProductOf(
  state: ProductsState,
  editor: EditorState,
  mode: SaveMode,
): { product: Product; existing: Product | null } | null {
  if (hasFormErrors(validateProductDraft(editor.draft, { mode, otherNames: otherProductNames(state, editor) }))) return null;
  const existing = state.products.find((product) => product.id === editor.productId) ?? null;
  return { product: applyProductDraft(editor.draft, existing ?? newProductBase(editor.draft, state.products), mode), existing };
}

function saveEditor(state: ProductsState, editor: EditorState, mode: SaveMode): ProductsState {
  const saved = savedProductOf(state, editor, mode);
  if (!saved) return { ...state, editor: { ...editor, attemptedMode: mode }, notice: BLOCKED_SAVE_MESSAGE };
  return commitSavedProduct(state, editor, saved.product, mode);
}

/** Puts the saved product in the list (replacing it, or last when new) and reopens the editor on it. */
function commitSavedProduct(state: ProductsState, editor: EditorState, product: Product, mode: SaveMode): ProductsState {
  const saved = toProductDraft(product);
  return {
    ...state,
    products: upsertProduct(state.products, product),
    version: state.version + 1,
    editor: {
      ...openEditor(product.id, saved),
      nextOptionNumber: editor.nextOptionNumber,
      nextGroupNumber: editor.nextGroupNumber,
    },
    notice:
      mode === "publish"
        ? `${product.name} se publicó en la carta.`
        : `${product.name} se guardó como borrador y no se muestra en la carta.`,
  };
}

/** Editor and preview actions of `productsReducer`. */
export function editorReducer(state: ProductsState, action: EditorAction): ProductsState {
  if (action.type === "open-editor") {
    const product = state.products.find((candidate) => candidate.id === action.id);
    if (!product) return state;
    return { ...state, screen: "editor", editor: openEditor(product.id, toProductDraft(product)), notice: null };
  }
  if (action.type === "open-new") {
    return { ...state, screen: "editor", editor: openEditor(null, createEmptyDraft()), notice: null };
  }
  const { editor } = state;
  if (!editor) return state;
  const { draft } = editor;

  switch (action.type) {
    case "close-editor":
      return { ...state, screen: "list", editor: null };
    case "open-preview":
      return { ...state, screen: "preview", editor: { ...editor, editingOptionId: null, editingGroupId: null } };
    case "close-preview":
      return { ...state, screen: "editor" };
    case "set-field":
      return withDraft(state, editor, { [action.field]: action.value });
    case "set-category":
      return withDraft(state, editor, { categoryId: action.categoryId });
    case "toggle-moment": {
      const moments = draft.moments.includes(action.moment)
        ? draft.moments.filter((moment) => moment !== action.moment)
        : [...draft.moments, action.moment];
      return withDraft(state, editor, { moments });
    }
    case "set-draft-availability":
      return withDraft(state, editor, { available: action.available });
    case "set-draft-publication":
      return withDraft(state, editor, { published: action.published });
    case "set-customer-notes":
      return withDraft(state, editor, { allowCustomerNotes: action.allow });
    case "set-image":
      return withDraft(state, editor, { image: action.image });
    case "add-group": {
      const group: OptionGroupDraft = {
        id: `grupo-${editor.nextGroupNumber}`,
        title: "",
        selection: "multiple",
        required: false,
        options: [],
      };
      return {
        ...state,
        editor: {
          ...editor,
          draft: { ...draft, optionGroups: [...draft.optionGroups, group] },
          editingGroupId: group.id,
          nextGroupNumber: editor.nextGroupNumber + 1,
        },
      };
    }
    case "edit-group":
      return { ...state, editor: { ...editor, editingGroupId: action.groupId } };
    case "finish-group-edit":
      return { ...state, editor: { ...editor, editingGroupId: null } };
    case "rename-group":
      return withGroup(state, editor, action.groupId, (group) => ({ ...group, title: action.title }));
    case "remove-group": {
      const removed = draft.optionGroups.find((group) => group.id === action.groupId);
      const editingRemovedOption = removed?.options.some((option) => option.id === editor.editingOptionId);
      return {
        ...state,
        editor: {
          ...editor,
          draft: { ...draft, optionGroups: draft.optionGroups.filter((group) => group.id !== action.groupId) },
          editingGroupId: editor.editingGroupId === action.groupId ? null : editor.editingGroupId,
          editingOptionId: editingRemovedOption ? null : editor.editingOptionId,
        },
      };
    }
    case "set-group-selection":
      // A single group has no limit and a multiple one no preselected option.
      return withGroup(state, editor, action.groupId, (group) =>
        action.selection === "single"
          ? { ...group, selection: "single", max: undefined }
          : { ...group, selection: "multiple", defaultOptionId: undefined },
      );
    case "set-group-required":
      return withGroup(state, editor, action.groupId, (group) => ({ ...group, required: action.required }));
    case "set-group-max":
      return withGroup(state, editor, action.groupId, (group) => ({ ...group, max: action.max }));
    case "set-default-option":
      return withGroup(state, editor, action.groupId, (group) => ({ ...group, defaultOptionId: action.optionId }));
    case "add-option": {
      if (!draft.optionGroups.some((group) => group.id === action.groupId)) return state;
      const option: OptionDraft = { id: `opcion-${editor.nextOptionNumber}`, name: "", priceDelta: "0" };
      const next = withGroup(state, editor, action.groupId, (group) => ({ ...group, options: [...group.options, option] }));
      return {
        ...next,
        editor: { ...next.editor!, editingOptionId: option.id, nextOptionNumber: editor.nextOptionNumber + 1 },
      };
    }
    case "edit-option":
      return { ...state, editor: { ...editor, editingOptionId: action.id } };
    case "finish-option-edit":
      return { ...state, editor: { ...editor, editingOptionId: null } };
    case "update-option":
      return withGroup(state, editor, action.groupId, (group) => ({
        ...group,
        options: group.options.map((option) => (option.id === action.id ? { ...option, ...action.changes } : option)),
      }));
    case "remove-option": {
      const next = withGroup(state, editor, action.groupId, (group) => ({
        ...group,
        options: group.options.filter((option) => option.id !== action.id),
      }));
      return {
        ...next,
        editor: { ...next.editor!, editingOptionId: editor.editingOptionId === action.id ? null : editor.editingOptionId },
      };
    }
    case "save":
      return saveEditor(state, editor, action.mode);
    case "save-started":
      return { ...state, editor: { ...editor, saving: true, serverErrors: null, saveError: null }, notice: "Guardando…" };
    case "save-succeeded":
      // Another product was opened meanwhile: only the list takes the saved one.
      if (!editor.saving) return { ...state, products: upsertProduct(state.products, action.product), version: state.version + 1 };
      return commitSavedProduct(state, editor, action.product, action.mode);
    case "save-failed": {
      const serverErrors = toFormErrors(action.issues, draft);
      const name = editor.saved.name.trim() || draft.name.trim() || "el producto";
      return hasFormErrors(serverErrors)
        ? { ...state, editor: { ...editor, saving: false, serverErrors }, notice: BLOCKED_SAVE_MESSAGE }
        : {
            ...state,
            editor: { ...editor, saving: false, saveError: FAILED_SAVE_MESSAGE },
            notice: `No se pudo guardar ${name}. Intentá de nuevo.`,
          };
    }
    case "discard":
      return { ...state, editor: openEditor(editor.productId, editor.saved) };
  }
}

/** What the API needs to save the editor: PATCH of `productId`, or POST when it is null. */
export type SaveRequest = { productId: string | null; body: ProductBody };

/** The request of a save in `mode`, or null when the form blocks it (dispatch `save` to show why). */
export function getSaveRequest(state: ProductsState, mode: SaveMode): SaveRequest | null {
  const { editor } = state;
  if (!editor) return null;
  const saved = savedProductOf(state, editor, mode);
  if (!saved) return null;
  return { productId: saved.existing?.id ?? null, body: toProductBody(saved.product, saved.existing) };
}

export type SaveTone = "neutral" | "warning" | "danger";

/** One "Personalizaciones" card of the editor. */
export type OptionGroupView = {
  id: string;
  /** Title as typed, e.g. "Tamaño". */
  title: string;
  /** "Selección única · Obligatorio", "Selección múltiple · Máximo 2". */
  meta: string;
  options: OptionDraft[];
};

export type EditorView = {
  /** "Editar producto" or "Nuevo producto". */
  title: string;
  /** Last breadcrumb segment: the saved name, or "Nuevo producto". */
  breadcrumb: string;
  status: ProductStatus;
  statusLabel: string;
  changes: string[];
  dirty: boolean;
  /** Visible errors: only after a blocked save. */
  errors: ProductFormErrors;
  saveTitle: string;
  saveTone: SaveTone;
  /** Second line of the save bar. */
  saveHint: string;
  /** Publication of the draft, as the header "Publication Control" shows it. */
  published: boolean;
  /** "Publicado" / "No publicado". */
  publicationLabel: string;
  /** Mode of "Guardar cambios": the publication chosen in the header. */
  primarySaveMode: SaveMode;
  /** Groups of the draft, in display order. */
  optionGroups: OptionGroupView[];
  /** Options of the "Categoría" select. */
  categories: readonly ProductCategoryOption[];
  /** 07C "Cappuccino publicado". */
  previewTitle: string;
  preview: PreviewModel;
};

function mergeErrors(server: ProductFormErrors, form: ProductFormErrors): ProductFormErrors {
  const groupIds = new Set([...Object.keys(server.optionGroups ?? {}), ...Object.keys(form.optionGroups ?? {})]);
  const optionGroups = Object.fromEntries(
    [...groupIds].map((id) => {
      const fromServer = server.optionGroups?.[id] ?? {};
      const fromForm = form.optionGroups?.[id] ?? {};
      const options = { ...fromServer.options, ...fromForm.options };
      return [id, { ...fromServer, ...fromForm, ...(Object.keys(options).length > 0 ? { options } : {}) }];
    }),
  );
  return { ...server, ...form, ...(groupIds.size > 0 ? { optionGroups } : {}) };
}

const PREVIEW_STATUS: Record<ProductStatus, string> = {
  published: "publicado",
  draft: "en borrador",
  archived: "archivado",
};

export function getEditorView(state: ProductsState): EditorView | null {
  const { editor } = state;
  if (!editor) return null;
  const product = state.products.find((candidate) => candidate.id === editor.productId);
  const isNew = !product;
  const status: ProductStatus = product ? getProductStatus(product) : "draft";
  const changes = getProductChanges(editor.saved, editor.draft);
  const dirty = changes.length > 0;
  const formErrors = editor.attemptedMode
    ? validateProductDraft(editor.draft, { mode: editor.attemptedMode, otherNames: otherProductNames(state, editor) })
    : {};
  // The form's own messages win over the API's for the same field.
  const errors = editor.serverErrors ? mergeErrors(editor.serverErrors, formErrors) : formErrors;
  const blocked = hasFormErrors(errors);

  let saveTitle = "Producto sin cambios";
  let saveTone: SaveTone = "neutral";
  if (editor.saving) {
    saveTitle = "Guardando…";
    saveTone = "warning";
  } else if (blocked) {
    saveTitle = BLOCKED_SAVE_MESSAGE;
    saveTone = "danger";
  } else if (editor.saveError) {
    saveTitle = editor.saveError;
    saveTone = "danger";
  } else if (dirty) {
    saveTitle = "Tenés cambios sin guardar";
    saveTone = "warning";
  } else if (isNew) {
    saveTitle = "Producto nuevo sin guardar";
    saveTone = "warning";
  }

  return {
    title: isNew ? "Nuevo producto" : "Editar producto",
    breadcrumb: product?.name ?? "Nuevo producto",
    status,
    statusLabel: PRODUCT_STATUS_LABELS[status],
    changes,
    dirty,
    errors,
    saveTitle,
    saveTone,
    saveHint: "La publicación actual no cambia hasta guardar.",
    published: editor.draft.published,
    publicationLabel: editor.draft.published ? "Publicado" : "No publicado",
    primarySaveMode: editor.draft.published ? "publish" : "draft",
    optionGroups: editor.draft.optionGroups.map((group) => ({
      id: group.id,
      title: group.title,
      meta: getOptionGroupMeta(group),
      options: group.options,
    })),
    categories: state.categories,
    previewTitle: product ? `${product.name} ${PREVIEW_STATUS[status]}` : "Nuevo producto sin guardar",
    preview: getPreviewModel(editor.draft, state.categories),
  };
}
