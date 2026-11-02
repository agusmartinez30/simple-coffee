import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Coffee, MapPin } from "lucide-react";
import { TableNumberText, ValidTableOnly } from "@/features/table-access";

export const LINE_ART_SRC = encodeURI("/assets/Ilustración · Café Central line art.png");

/** "Bienvenida alternativa": brand-blue landing shown after scanning the table QR. */
export function WelcomeScreen() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-brand text-white">
      {/* Full-bleed brand background beyond the 390px column. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-brand" />
      <main className="flex flex-1 flex-col justify-between gap-6 px-5 pt-3 pb-6">
        <header className="flex h-11 items-center justify-between">
          <div className="flex items-center gap-[9px]">
            <span className="flex size-9 items-center justify-center rounded-full outline-[1.5px] -outline-offset-[0.75px] outline-white outline-solid">
              <Coffee size={19} aria-hidden="true" />
            </span>
            <span className="text-[13px] font-bold tracking-[1.6px]">CAFÉ CENTRAL</span>
          </div>
          {/* The table badge appears only once the scanned QR has been validated. */}
          <ValidTableOnly>
            <span className="flex h-[34px] items-center gap-1.5 rounded-[17px] px-[11px] outline-1 -outline-offset-[0.5px] outline-white/50 outline-solid">
              <MapPin size={14} aria-hidden="true" />
              <span className="text-[11px] font-bold">
                Mesa <TableNumberText />
              </span>
            </span>
          </ValidTableOnly>
        </header>

        <section className="flex flex-col gap-2">
          <h1 className="flex flex-col gap-2">
            <span className="text-[38px] font-bold tracking-[-1.4px]">Bienvenido a</span>
            <span className="font-display text-[49px] leading-[41px] font-bold">
              nuestro rincón
              <br />
              favorito.
            </span>
          </h1>
          <p className="text-[15px] leading-5 text-white/79">
            Un buen momento empieza
            <br />
            con algo rico.
          </p>
        </section>

        <div className="flex h-[230px] items-center justify-center">
          <Image
            src={LINE_ART_SRC}
            alt=""
            width={340}
            height={230}
            unoptimized
            loading="eager"
            className="h-[230px] w-[340px] max-w-full object-contain"
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-[10px] font-bold tracking-[1.8px] text-white/72">
            CAFÉ · BRUNCH · MERIENDAS
          </p>
          <Link
            href="/explore"
            className="flex h-[58px] w-full items-center justify-between rounded-[29px] bg-surface px-[18px] text-brand transition-colors active:bg-brand-soft"
          >
            <span className="text-[16px] font-bold">Explorar carta</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-tint">
              <ArrowRight size={19} aria-hidden="true" />
            </span>
          </Link>
          <p className="text-[10px] text-white/66">Hecho para disfrutar, preparado con amor.</p>
        </div>
      </main>
    </div>
  );
}
