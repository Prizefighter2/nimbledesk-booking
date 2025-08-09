// src/NimbleDeskBooking.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * NimbleDesk Booking – v0.5 (complete)
 * Step 1: Service + Name (required) + Email/Phone (at least one) -> clientLookup
 * Step 2: Availability (API + mock fallback) -> select slot
 * Step 3: Details review & submit -> createBooking
 * Step 4: Result (success/conflict)
 */

const API_URL = import.meta.env.VITE_NIMBLEDESK_API || "";

export default function NimbleDeskBooking() {
    // ----- Services (demo) -----
    const services = useMemo(
        () => [
            { id: "cut", name: "Standard Cut", durationMins: 30, price: 18 },
            { id: "beard", name: "Beard Trim", durationMins: 15, price: 8 },
            { id: "kids", name: "Kids Cut", durationMins: 20, price: 12 },
        ],
        []
    );

    const [step, setStep] = useState(1);

    // Step 1 form
    const [serviceId, setServiceId] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    // Lookup result
    const [clientMatch, setClientMatch] = useState(null);

    // Generic UI state
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    // Step 2 availability
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilityErr, setAvailabilityErr] = useState("");
    const [slots, setSlots] = useState([]);
    const [selectedSlotISO, setSelectedSlotISO] = useState("");

    // Step 3 extra fields
    const [notes, setNotes] = useState("");
    const [contactPreference, setContactPreference] = useState("");

    // Step 4 result
    const [bookingResult, setBookingResult] = useState(null);

    // Validation
    const serviceSelected = Boolean(serviceId);
    const namePresent = name.trim().length > 0;
    const emailLooksOK = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneLooksOK = !phone || /^[0-9+\-()\s]{7,}$/.test(phone);
    const hasAtLeastOneContact = email.trim().length > 0 || phone.trim().length > 0;
    const canContinueStep1 =
        serviceSelected && namePresent && hasAtLeastOneContact && emailLooksOK && phoneLooksOK && !loading;

    // Helpers
    const selectedService = services.find((s) => s.id === serviceId);
    const serviceName = selectedService?.name || serviceId || "Service";

    async function handleNextFromStep1() {
        if (!canContinueStep1 || !API_URL) return;
        setErr("");
        try {
            setLoading(true);
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
            const data = await safeJSON(res);
            if (!res.ok || data?.ok === false) throw new Error(data?.message || "Lookup failed.");
            setClientMatch(data.client || null);
            setStep(2);
        } catch (e) {
            setErr(e.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    // Step 2: load availability
    useEffect(() => {
        const loadAvailability = async () => {
            if (step !== 2) return;
            setAvailabilityErr("");
            setAvailabilityLoading(true);
            setSlots([]);
            setSelectedSlotISO("");

            const durationMins = selectedService?.durationMins ?? 30;
            const clientBufferMins = clientMatch?.clientBufferMins ?? 0;
            const staffBufferMins = clientMatch?.staffBufferMins ?? 0;

            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        action: "availability",
                        serviceId,
                        durationMins,
                        clientBufferMins,
                        staffBufferMins,
                    }),
                });
                const data = await safeJSON(res);
                if (!res.ok || data?.ok === false) throw new Error(data?.message || "Availability failed.");
                setSlots(Array.isArray(data.slots) ? data.slots : []);
            } catch (e) {
                setAvailabilityErr(e.message || "Failed to fetch availability; showing example slots.");
                // mock fallback
                const now = new Date();
                now.setMinutes(0, 0, 0);
                const mock = [];
                for (let i = 1; i <= 6; i++) {
                    const d = new Date(now.getTime() + i * 60 * 60 * 1000);
                    mock.push(d.toISOString());
                }
                setSlots(mock);
            } finally {
                setAvailabilityLoading(false);
            }
        };
        loadAvailability();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, serviceId, clientMatch]);

    async function handleCreateBooking() {
        if (!selectedSlotISO) return;
        setErr("");
        setLoading(true);
        setBookingResult(null);

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({
                    action: "createBooking",
                    isoSlot: selectedSlotISO,
                    name,
                    email,
                    phone,
                    notes,
                    contactPreference,
                    // IMPORTANT: pass a *name* that exists in your Services sheet if you want it to match
                    service: serviceName,
                    // Optional: staff (uses "General" fallback in doPost/processBooking)
                    // staff: "Your Staff Name",
                }),
            });
            const data = await safeJSON(res);
            // processBooking returns {status:"success"} or {status:"conflict"}
            if (!res.ok) throw new Error(data?.message || "Booking failed.");
            setBookingResult(data);
            setStep(4);
        } catch (e) {
            setErr(e.message || "Something went wrong submitting the booking.");
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
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-black text-white font-semibold">N</span>
                            <h1 className="text-lg font-semibold">NimbleDesk Booking</h1>
                        </div>
                        <span className="text-sm text-neutral-500">Demo</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <StepPill active={step >= 1} label="Service & Client" />
                        <StepDivider />
                        <StepPill active={step >= 2} label="Date & Time" />
                        <StepDivider />
                        <StepPill active={step >= 3} label="Details" />
                        <StepDivider />
                        <StepPill active={step >= 4} label="Confirm" />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-8">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    {/* STEP 1 */}
                    {step === 1 && (
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-xl font-semibold">Choose your service</h2>
                                <p className="mt-1 text-sm text-neutral-500">
                                    We’ll match your details first, then show live availability with any required buffers.
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

                            <div>
                                <h3 className="text-lg font-semibold">Your details (for match)</h3>
                                <p className="mt-1 text-sm text-neutral-500">Enter your name and email and/or phone.</p>

                                <div className="mt-4 space-y-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium">
                                            Name <span className="text-red-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your full name"
                                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${namePresent ? "border-neutral-300 focus:ring-black" : "border-red-400 focus:ring-red-500"
                                                }`}
                                        />
                                        {!namePresent && <p className="text-xs text-red-600">Name is required.</p>}
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium">Email</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${emailLooksOK ? "border-neutral-300 focus:ring-black" : "border-red-400 focus:ring-red-500"
                                                    }`}
                                            />
                                            {!emailLooksOK && <p className="text-xs text-red-600">That email looks off.</p>}
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium">Phone</label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+44 7…"
                                                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${phoneLooksOK ? "border-neutral-300 focus:ring-black" : "border-red-400 focus:ring-red-500"
                                                    }`}
                                            />
                                            {!phoneLooksOK && <p className="text-xs text-red-600">That phone looks off.</p>}
                                        </div>
                                    </div>

                                    {!hasAtLeastOneContact && (
                                        <p className="text-xs text-amber-700">Add at least one contact method (email or phone) to continue.</p>
                                    )}
                                    {!API_URL && (
                                        <p className="text-xs text-amber-700">
                                            API URL missing. Set <code>VITE_NIMBLEDESK_API</code> in <code>.env.local</code> and restart dev server.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

                            <div className="flex items-center justify-between">
                                <div className="text-sm text-neutral-500">Next: we’ll check if you’re an existing client, then show times.</div>
                                <button
                                    onClick={handleNextFromStep1}
                                    disabled={!canContinueStep1 || !API_URL}
                                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${canContinueStep1 && API_URL ? "bg-black text-white hover:opacity-90" : "bg-neutral-200 text-neutral-500"
                                        }`}
                                >
                                    {loading ? "Checking…" : "Continue"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Date & Time</h2>
                            <p className="text-sm text-neutral-500">Choose a slot.</p>

                            {availabilityErr && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{availabilityErr}</div>
                            )}

                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Available slots</h3>
                                {availabilityLoading ? (
                                    <p className="text-sm text-neutral-500">Loading slots…</p>
                                ) : slots.length === 0 ? (
                                    <p className="text-sm text-neutral-600">No slots found.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {slots.map((iso) => {
                                            const d = new Date(iso);
                                            const label = d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
                                            const selected = selectedSlotISO === iso;
                                            return (
                                                <button
                                                    key={iso}
                                                    className={`rounded-xl border px-3 py-2 text-sm hover:border-black ${selected ? "border-black" : "border-neutral-300"
                                                        }`}
                                                    onClick={() => setSelectedSlotISO(iso)}
                                                    title={iso}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setStep(1)} className="rounded-xl border border-neutral-300 px-4 py-2 text-sm">
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!selectedSlotISO}
                                    className={`rounded-xl px-4 py-2 text-sm font-medium ${selectedSlotISO ? "bg-black text-white" : "bg-neutral-200 text-neutral-500"
                                        }`}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Your details</h2>
                            <p className="text-sm text-neutral-500">Confirm and submit your booking.</p>

                            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
                                <strong>Service:</strong> {serviceName}{" "}
                                <span className="text-neutral-500">({selectedService?.durationMins ?? 30} mins)</span>
                                <br />
                                <strong>Slot:</strong>{" "}
                                {selectedSlotISO
                                    ? new Date(selectedSlotISO).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                                    : "—"}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium">Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium">Phone</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium">Contact preference</label>
                                    <select
                                        value={contactPreference}
                                        onChange={(e) => setContactPreference(e.target.value)}
                                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    >
                                        <option value="">No preference</option>
                                        <option value="email">Email</option>
                                        <option value="phone">Phone</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-sm font-medium">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>

                            {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

                            <div className="flex gap-2">
                                <button onClick={() => setStep(2)} className="rounded-xl border border-neutral-300 px-4 py-2 text-sm">
                                    Back
                                </button>
                                <button
                                    onClick={handleCreateBooking}
                                    disabled={loading || !selectedSlotISO}
                                    className={`rounded-xl px-4 py-2 text-sm font-medium ${selectedSlotISO ? "bg-black text-white" : "bg-neutral-200 text-neutral-500"
                                        }`}
                                >
                                    {loading ? "Submitting…" : "Confirm booking"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4 */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Booking result</h2>
                            {bookingResult?.status === "success" && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                    <p className="text-sm">
                                        ✅ Booking confirmed for <strong>{serviceName}</strong> on{" "}
                                        {selectedSlotISO
                                            ? new Date(selectedSlotISO).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                                            : "—"}
                                        .
                                    </p>
                                </div>
                            )}
                            {bookingResult?.status === "conflict" && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <p className="text-sm">⚠️ That slot was just taken. Please pick a different time.</p>
                                </div>
                            )}
                            {!bookingResult && (
                                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                                    <p className="text-sm">No result received.</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        // reset to start
                                        setStep(1);
                                        setSelectedSlotISO("");
                                        setSlots([]);
                                        setNotes("");
                                        setContactPreference("");
                                        setBookingResult(null);
                                        setClientMatch(null);
                                    }}
                                    className="rounded-xl border border-neutral-300 px-4 py-2 text-sm"
                                >
                                    Make another booking
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <p className="mt-6 text-center text-xs text-neutral-500">v0.5 · Availability + booking submit</p>
            </main>
        </div>
    );
}

function StepPill({ active, label }) {
    return (
        <div className={`rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-black text-white" : "bg-neutral-200 text-neutral-600"}`}>{label}</div>
    );
}

function StepDivider() {
    return <div className="h-[2px] w-6 shrink-0 rounded bg-neutral-300" />;
}

async function safeJSON(res) {
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return { ok: false, message: "Unexpected response", raw: text };
    }
}
