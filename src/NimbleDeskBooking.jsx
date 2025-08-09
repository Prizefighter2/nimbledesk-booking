// src/NimbleDeskBooking.jsx
import React, { useMemo, useState } from "react";

/**
 * NimbleDesk Booking – v0.3.1
 * - Step 1: Service + Name (required) + Email/Phone (at least one)
 * - POST to Apps Script without headers (avoids CORS preflight)
 * - Stores clientMatch for use in Availability step
 */

const API_URL = import.meta.env.VITE_NIMBLEDESK_API || "";

export default function NimbleDeskBooking() {
    // ----- MOCK services (replace with real fetch later) -----
    const services = useMemo(
        () => [
            { id: "cut", name: "Standard Cut", durationMins: 30, price: 18 },
            { id: "skinfade", name: "Skin Fade", durationMins: 45, price: 25 },
            { id: "kids", name: "Kids Cut", durationMins: 20, price: 12 },
        ],
        []
    );

    // ----- Step state -----
    const [step, setStep] = useState(1);

    // ----- Form state (Step 1) -----
    const [serviceId, setServiceId] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    // ----- Result of client lookup -----
    const [clientMatch, setClientMatch] = useState(null);

    // ----- UI state -----
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    // Validation
    const serviceSelected = Boolean(serviceId);
    const namePresent = name.trim().length > 0;
    const emailLooksOK = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneLooksOK = !phone || /^[0-9+\-()\s]{7,}$/.test(phone);
    const hasAtLeastOneContact = email.trim().length > 0 || phone.trim().length > 0;
    const canContinue =
        serviceSelected &&
        namePresent &&
        hasAtLeastOneContact &&
        emailLooksOK &&
        phoneLooksOK &&
        !loading;

    async function handleNext() {
        if (!canContinue) return;
        setErr("");

        try {
            setLoading(true);

            // IMPORTANT: no headers -> browser uses text/plain -> avoids CORS preflight
            const res = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({
                    action: "clientLookup",
                    name,
                    email,
                    phone,
                    serviceId,
                }),
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error("Unexpected response from server.");
            }

            if (!res.ok || data?.ok === false) {
                throw new Error(data?.message || "Lookup failed.");
            }

            setClientMatch(data.client || null);
            setStep(2);
        } catch (e) {
            console.error(e);
            setErr(e.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-neutral-100 text-neutral-900">
            <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
                <div className="mx-auto max-w-3xl px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-black text-white font-semibold">
                                N
                            </span>
                            <h1 className="text-lg font-semibold">NimbleDesk Booking</h1>
                        </div>
                        <span className="text-sm text-neutral-500">Demo</span>
                    </div>

                    {/* Progress */}
                    <div className="mt-4 flex items-center gap-2">
                        <StepPill active={step >= 1} label="Service & Client" />
                        <StepDivider />
                        <StepPill active={step >= 2} label="Date & Time" />
                        <StepDivider />
                        <StepPill active={step >= 3} label="Details" />
                        <StepDivider />
                        <StepPill active={step >= 4} label="Payment" />
                        <StepDivider />
                        <StepPill active={step >= 5} label="Confirm" />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-8">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    {step === 1 && (
                        <div className="space-y-8">
                            {/* Service */}
                            <div>
                                <h2 className="text-xl font-semibold">Choose your service</h2>
                                <p className="mt-1 text-sm text-neutral-500">
                                    We’ll match your details first, then show live availability with any
                                    required buffers.
                                </p>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium">Service</label>
                                    <div className="mt-2">
                                        <select
                                            value={serviceId}
                                            onChange={(e) => setServiceId(e.target.value)}
                                            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                        >
                                            <option value="">Select a service…</option>
                                            {services.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} · {s.durationMins} mins · £{s.price}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Client details for match */}
                            <div>
                                <h3 className="text-lg font-semibold">Your details (for match)</h3>
                                <p className="mt-1 text-sm text-neutral-500">
                                    Enter your name and email and/or phone. We’ll use this to check if
                                    you’re an existing client so we can apply the right buffer rules.
                                </p>

                                <div className="mt-4 space-y-4">
                                    {/* Name (required) */}
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium">
                                            Name <span className="text-red-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your full name"
                                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${name.trim().length > 0
                                                    ? "border-neutral-300 focus:ring-black"
                                                    : "border-red-400 focus:ring-red-500"
                                                }`}
                                        />
                                        {name.trim().length === 0 && (
                                            <p className="text-xs text-red-600">Name is required.</p>
                                        )}
                                    </div>

                                    {/* Email + Phone grid */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {/* Email */}
                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium">Email</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${emailLooksOK
                                                        ? "border-neutral-300 focus:ring-black"
                                                        : "border-red-400 focus:ring-red-500"
                                                    }`}
                                            />
                                            {!emailLooksOK && (
                                                <p className="text-xs text-red-600">That email looks off.</p>
                                            )}
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium">Phone</label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+44 7…"
                                                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${phoneLooksOK
                                                        ? "border-neutral-300 focus:ring-black"
                                                        : "border-red-400 focus:ring-red-500"
                                                    }`}
                                            />
                                            {!phoneLooksOK && (
                                                <p className="text-xs text-red-600">That phone looks off.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* At least one contact hint */}
                                    {!hasAtLeastOneContact && (
                                        <p className="text-xs text-amber-700">
                                            Add at least one contact method (email or phone) to continue.
                                        </p>
                                    )}

                                    {/* API URL hint if missing */}
                                    {!API_URL && (
                                        <p className="text-xs text-amber-700">
                                            API URL missing. Set <code>VITE_NIMBLEDESK_API</code> in <code>.env.local</code> and restart the dev server.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Error banner */}
                            {err && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {err}
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="text-sm text-neutral-500">
                                    Next: we’ll check if you’re an existing client, then show times.
                                </div>
                                <button
                                    onClick={handleNext}
                                    disabled={!canContinue || !API_URL}
                                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${canContinue && API_URL
                                            ? "bg-black text-white hover:opacity-90"
                                            : "bg-neutral-200 text-neutral-500"
                                        }`}
                                >
                                    {loading ? "Checking…" : "Continue"}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Date & Time (placeholder)</h2>
                            <p className="text-sm text-neutral-500">
                                Using match results to shape availability:
                            </p>
                            <pre className="overflow-auto rounded-xl bg-neutral-50 p-3 text-xs">
                                {JSON.stringify({ serviceId, clientMatch }, null, 2)}
                            </pre>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep(1)}
                                    className="rounded-xl border border-neutral-300 px-4 py-2 text-sm"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}

                    {step > 2 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Later steps placeholder</h2>
                            <p className="text-sm text-neutral-500">
                                We’ll wire Details → Payment (optional deposit) → Confirm.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="rounded-xl border border-neutral-300 px-4 py-2 text-sm"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep(Math.min(step + 1, 5))}
                                    className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer note */}
                <p className="mt-6 text-center text-xs text-neutral-500">
                    v0.3.1 · Client lookup wired (no-preflight POST) and stored for availability
                </p>
            </main>
        </div>
    );
}

function StepPill({ active, label }) {
    return (
        <div
            className={`rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-black text-white" : "bg-neutral-200 text-neutral-600"
                }`}
        >
            {label}
        </div>
    );
}

function StepDivider() {
    return <div className="h-[2px] w-6 shrink-0 rounded bg-neutral-300" />;
}
