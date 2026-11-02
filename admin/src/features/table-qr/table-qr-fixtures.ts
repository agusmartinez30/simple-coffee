/** `GET /tables/config` body as the API answers it (dates as ISO strings), for the table-qr tests. */
export const API_CONFIG = {
  spaces: [
    { id: "salon", name: "Salón", icon: "armchair", tone: "brand" },
    { id: "terraza", name: "Terraza", icon: "sun", tone: "warning" },
  ],
  tables: [
    {
      id: "tbl_07",
      number: 7,
      label: "Mesa 07",
      spaceId: "salon",
      capacity: 4,
      description: "",
      enabled: true,
      version: 18,
      layout: { x: 0, y: 0, width: 96, height: 96, shape: "square" },
      qr: { token: "4pX9kR2mL7", issuedAt: "2026-11-02T13:00:00.000Z", issuedBy: { id: "staff-1", name: "María G." } },
      revokedQrs: [
        {
          token: "Q7wE3rT9yU",
          issuedAt: "2026-06-12T13:00:00.000Z",
          issuedBy: { id: "staff-1", name: "María G." },
          revokedAt: "2026-11-02T13:00:00.000Z",
          auditNumber: 118,
        },
      ],
    },
    {
      id: "tbl_02",
      number: 2,
      label: "Mesa 02",
      spaceId: "terraza",
      capacity: 2,
      description: "",
      enabled: false,
      version: 1,
      layout: { x: 0, y: 0, width: 96, height: 96, shape: "round" },
      qr: null,
      revokedQrs: [],
    },
  ],
};
