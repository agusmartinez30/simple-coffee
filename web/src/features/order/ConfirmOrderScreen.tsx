"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Armchair, ReceiptText, Send, User } from "lucide-react";
import clsx from "clsx";
import { TABLE } from "@/mocks/table";
import { useCart } from "@/features/cart";
import { useTableSession } from "@/features/table-session";
import { delay, formatClockTime } from "@/shared/lib/delay";
import { formatPrice } from "@/shared/lib/format-price";
import { PrimaryButton, formatItemCount } from "@/shared/ui";
import { OrderOutcomeView } from "./OrderOutcomeView";
import { getCartLineView, type CartLineView } from "./order-lines";
import { ORDER_OUTCOMES } from "./order-outcomes";

const SEND_DELAY_MS = 900;
const MAX_NAME_LENGTH = 40;
const MAX_NOTE_LENGTH = 140;

const field =
  "w-full rounded-field bg-surface outline-1 -outline-offset-[0.5px] outline-line outline-solid focus-within:outline-2 focus-within:outline-brand";

/** Screen 05 · Confirmar pedido: customer name, general notes and the order summary. */
export function ConfirmOrderScreen() {
  const router = useRouter();
  const { lines, itemCount, subtotal, hydrated, clear } = useCart();
  const { placeOrder, tableStatus } = useTableSession();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [nameError, setNameError] = useState(false);
  const [sending, setSending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [staffNotified, setStaffNotified] = useState(false);

  const items = lines.map(getCartLineView).filter((item): item is CartLineView => item !== null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    if (tableStatus === "closed") {
      setBlocked(true);
      return;
    }
    setSending(true);
    await delay(SEND_DELAY_MS);
    const result = placeOrder({
      customerName: name,
      note,
      time: formatClockTime(new Date()),
      lines,
    });
    if (result.ok) {
      router.push(`/order/${result.order.id}`);
      clear();
      return;
    }
    setSending(false);
    if (result.reason === "table-closed") setBlocked(true);
    else if (result.reason === "missing-name") setNameError(true);
    else router.push("/order");
  }

  if (blocked) {
    return (
      <OrderOutcomeView
        copy={ORDER_OUTCOMES.closed}
        onPrimary={() => setStaffNotified(true)}
        feedback={staffNotified ? "Avisamos al personal. En breve se acercan a tu mesa." : undefined}
      />
    );
  }

  const isEmpty = hydrated && items.length === 0 && !sending;

  return (
    <>
      <header className="flex h-[60px] items-center gap-3.5 px-4 pt-2">
        <Link
          href="/order"
          aria-label="Volver a mi pedido"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink outline-1 -outline-offset-[0.5px] outline-line outline-solid"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1 className="font-display text-[32px] leading-none font-bold text-ink">
          Confirmar pedido
        </h1>
      </header>

      <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col gap-3.5 px-4 pt-3.5 pb-6">
        <div className="flex h-12 items-center justify-between rounded-xl bg-brand-tint px-3.5 text-brand">
          <span className="flex items-center gap-2">
            <Armchair size={18} aria-hidden="true" />
            <span className="text-[12.5px] font-bold">
              Mesa {TABLE.number}
              {TABLE.sharedAccount ? " · Cuenta compartida" : ""}
            </span>
          </span>
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
          <span className="sr-only">Mesa en línea</span>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-[14px] font-bold text-ink">Tus datos</h2>
          <label
            className={clsx(
              field,
              "flex h-12 cursor-text items-center gap-2.5 px-3.5",
              nameError && "outline-2 outline-danger",
            )}
          >
            <User size={17} className="shrink-0 text-ink" aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="text-[9.5px] text-muted">Nombre</span>
              <input
                name="name"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="given-name"
                required
                aria-invalid={nameError || undefined}
                aria-describedby={nameError ? "name-error" : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  if (nameError) setNameError(false);
                }}
                placeholder="¿Cómo te llamás?"
                className="w-full bg-transparent text-[13px] font-bold text-ink outline-none placeholder:font-normal placeholder:text-faint"
              />
            </span>
          </label>
          {nameError ? (
            <p id="name-error" className="text-[10.5px] font-bold text-danger">
              Ingresá tu nombre para que sepamos de quién es el pedido.
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <label htmlFor="order-note" className="text-[14px] font-bold text-ink">
            Notas generales
          </label>
          <textarea
            id="order-note"
            value={note}
            maxLength={MAX_NOTE_LENGTH}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ej: todo junto, por favor."
            className={clsx(
              field,
              "h-[58px] resize-none p-[13px] text-[12px] text-ink placeholder:text-faint focus:outline-2 focus:outline-brand",
            )}
          />
        </section>

        <section className="flex flex-col rounded-card bg-surface outline-1 -outline-offset-[0.5px] outline-line outline-solid">
          <div className="flex h-[42px] items-center justify-between px-3.5">
            <h2 className="text-[14px] font-bold text-ink">Resumen del pedido</h2>
            <span className="text-[10.5px] text-muted">{hydrated ? formatItemCount(itemCount) : ""}</span>
          </div>
          {isEmpty ? (
            <p className="border-t border-line px-3.5 py-3 text-[11.5px] text-muted">
              Tu pedido está vacío.{" "}
              <Link href="/explore" className="font-bold text-brand">
                Explorá el menú
              </Link>
            </p>
          ) : (
            <ul>
              {items.map((item) => (
                <li
                  key={item.line.id}
                  className="flex h-[42.5px] items-center justify-between gap-3 border-t border-line px-3.5"
                >
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate text-[11.5px] font-bold text-ink">{item.name}</span>
                    <span className="truncate text-[9.5px] text-muted">{item.summary}</span>
                  </span>
                  <span className="shrink-0 text-[11.5px] font-bold text-ink">
                    {formatPrice(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex h-[47.5px] items-center justify-between border-t border-line px-3.5">
            <span className="text-[15px] font-bold text-ink">Total</span>
            <span className="text-[19px] font-bold text-brand">{formatPrice(subtotal)}</span>
          </div>
        </section>

        <div className="flex items-center gap-2.5 rounded-xl bg-brand-tint p-3 text-brand">
          <ReceiptText size={20} className="shrink-0" aria-hidden="true" />
          <p className="text-[11.5px] leading-[14px] font-bold">
            No tenés que pagar ahora. Tu consumo se suma a la cuenta de la mesa.
          </p>
        </div>

        <PrimaryButton
          type="submit"
          icon={Send}
          iconPosition="end"
          loading={sending}
          disabled={isEmpty || !hydrated}
          className="mt-1.5"
        >
          {sending ? "Enviando pedido…" : "Enviar pedido"}
        </PrimaryButton>
        <p className="text-center text-[10px] text-muted">
          Al enviarlo, cocina recibe el pedido y se actualiza la cuenta de la mesa en tiempo real.
        </p>
      </form>
    </>
  );
}
