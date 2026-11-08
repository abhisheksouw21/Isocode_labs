"use client";

import { useState } from "react";
import type { StaySearch as Stay } from "@/lib/booking";
import { addDays, todayAtResort } from "@/lib/dates";

type Props = { stay: Stay; action?: string; variant?: "hero" | "compact"; anchor?: string };

/**
 * A plain GET form: it renders on the server and submits without JavaScript.
 * Once hydrated, check-out's minimum follows check-in, and a check-out that
 * falls on or before check-in moves to the next day.
 */
export function StaySearch({ stay, action = "/", variant = "compact", anchor }: Props) {
  const today = todayAtResort();
  const [checkIn, setCheckIn] = useState(stay.checkIn);
  const [checkOut, setCheckOut] = useState(stay.checkOut);
  const outMin = addDays(checkIn || today, 1);

  function changeIn(value: string) {
    setCheckIn(value);
    if (value && checkOut <= value) setCheckOut(addDays(value, 1));
  }

  const target = anchor ? `${action}#${anchor}` : action;
  const inProps = { suppressHydrationWarning: true, id: `${variant}-in`, name: "in", type: "date", required: true, min: today, max: addDays(today, 365), value: checkIn, onChange: (e: React.ChangeEvent<HTMLInputElement>) => changeIn(e.target.value) };
  const outProps = { suppressHydrationWarning: true, id: `${variant}-out`, name: "out", type: "date", required: true, min: outMin, max: addDays(today, 379), value: checkOut, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCheckOut(e.target.value) };

  if (variant === "hero") {
    const inline =
      "rounded-none border-0 border-b-2 border-mist/60 bg-transparent px-1 pb-1 font-display text-white [color-scheme:dark] focus:border-cherry focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";
    return (
      <form action={target} method="get" className="font-display text-[1.6rem] leading-[1.6] text-mist sm:text-[2rem]">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <label htmlFor={inProps.id}>Stay from</label>
          <input {...inProps} className={`${inline} min-h-11 w-[11.5rem] sm:w-[13rem]`} />
          <label htmlFor={outProps.id}>
            to<span className="sr-only"> (check-out date)</span>
          </label>
          <input {...outProps} className={`${inline} min-h-11 w-[11.5rem] sm:w-[13rem]`} />
        </p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span aria-hidden>for</span>
          <label htmlFor={`${variant}-adults`} className="sr-only">
            Adults
          </label>
          <select id={`${variant}-adults`} name="adults" defaultValue={stay.adults} className={`${inline} min-h-11 cursor-pointer pr-2`}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n} className="bg-canopy text-base">
                {n} {n === 1 ? "adult" : "adults"}
              </option>
            ))}
          </select>
          <span aria-hidden>and</span>
          <label htmlFor={`${variant}-children`} className="sr-only">
            Children
          </label>
          <select id={`${variant}-children`} name="children" defaultValue={stay.children} className={`${inline} min-h-11 cursor-pointer pr-2`}>
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n} className="bg-canopy text-base">
                {n} {n === 1 ? "child" : "children"}
              </option>
            ))}
          </select>
        </p>
        <button type="submit" className="btn mt-7 bg-white px-7 font-sans text-base text-canopy hover:bg-leaf">
          See rooms for these dates
        </button>
      </form>
    );
  }

  return (
    <form action={target} method="get" className="panel grid grid-cols-2 gap-3 p-4">
      <div>
        <label htmlFor={inProps.id} className="label">
          Check-in
        </label>
        <input {...inProps} className="field" />
      </div>
      <div>
        <label htmlFor={outProps.id} className="label">
          Check-out
        </label>
        <input {...outProps} className="field" />
      </div>
      <div>
        <label htmlFor={`${variant}-adults`} className="label">
          Adults
        </label>
        <select id={`${variant}-adults`} name="adults" defaultValue={stay.adults} className="field">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${variant}-children`} className="label">
          Children
        </label>
        <select id={`${variant}-children`} name="children" defaultValue={stay.children} className="field">
          {[0, 1, 2, 3, 4].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn-ghost col-span-2">
        Update dates
      </button>
    </form>
  );
}
