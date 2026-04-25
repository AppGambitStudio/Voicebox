import { Link } from "react-router-dom";
import { useApp } from "../lib/app-context";

const outcomes = [
  { label: "5-minute setup", value: "Configure once, paste one script tag, start receiving voice bookings." },
  { label: "20 free calls", value: "Every new account starts with a monthly free plan for real customer calls." },
  { label: "Local language UX", value: "Hindi, English, Hinglish, and regional language hints per business template." },
];

const features = [
  "Pre-built booking templates for common SMB workflows",
  "Cognito signup, DynamoDB usage tracking, and call transcripts",
  "Embeddable widget served from S3 and CloudFront",
  "Ready slot API boundary for future CRM and calendar sync",
];

export function Landing() {
  const { idToken, login } = useApp();

  return (
    <>
      <section className="border-b border-[#ded6ca] bg-[#fffaf1]">
        <div className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
          <div>
            <p className="mb-4 text-sm font-extrabold uppercase tracking-normal text-[#0d6b57]">Voicebox · Voice booking for Indian SMBs</p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl">
              Turn website visitors into booked visits in minutes.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4d5a53]">
              Voicebox is a self-serve voice booking widget by APPGAMBiT — built for clinics, salons, jewellery stores,
              real estate teams, restaurants, and local service businesses. Customers speak naturally in Hindi, English,
              or Hinglish while your business captures bookings, usage, duration, and transcripts in one place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {idToken ? (
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#0d6b57] px-5 font-extrabold text-white"
                  to="/setup"
                >
                  Configure Widget
                </Link>
              ) : (
                <button
                  className="min-h-12 rounded-lg bg-[#0d6b57] px-5 font-extrabold text-white"
                  type="button"
                  onClick={login}
                >
                  Start Free
                </button>
              )}
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#bdcbc4] bg-white px-5 font-extrabold text-[#18342b]"
                to="/setup"
              >
                View Templates
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-[#d8cec0] bg-white p-5 shadow-[0_24px_70px_rgba(22,37,31,0.12)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#ebe3d8] pb-4">
              <div>
                <p className="text-sm font-bold text-[#0d6b57]">Live booking assistant</p>
                <h2 className="mt-1 text-2xl font-black">Aarav Jewels</h2>
              </div>
              <span className="rounded-full bg-[#e8f3ef] px-3 py-1 text-xs font-extrabold text-[#0d6b57]">Hindi + Hinglish</span>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-lg bg-[#f7f4ee] p-4">
                <p className="text-sm font-bold text-[#596760]">Visitor</p>
                <p className="mt-1 text-base">Kal shaam store visit book karni hai.</p>
              </div>
              <div className="rounded-lg bg-[#0d6b57] p-4 text-white">
                <p className="text-sm font-bold text-white/80">Voicebox</p>
                <p className="mt-1 text-base">Kal 4:30 PM slot available hai. Aapka naam aur mobile number bata dijiye.</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-[#e0d8cc] p-3">
                <dt className="text-xs font-bold text-[#66746d]">Calls</dt>
                <dd className="mt-1 text-xl font-black">20</dd>
              </div>
              <div className="rounded-lg border border-[#e0d8cc] p-3">
                <dt className="text-xs font-bold text-[#66746d]">Setup</dt>
                <dd className="mt-1 text-xl font-black">5m</dd>
              </div>
              <div className="rounded-lg border border-[#e0d8cc] p-3">
                <dt className="text-xs font-bold text-[#66746d]">Embed</dt>
                <dd className="mt-1 text-xl font-black">1 tag</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-4 py-8 md:grid-cols-3">
        {outcomes.map((outcome) => (
          <div className="rounded-lg border border-[#ded6ca] bg-white p-5" key={outcome.label}>
            <h2 className="text-lg font-black">{outcome.label}</h2>
            <p className="mt-2 leading-7 text-[#596760]">{outcome.value}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-8 pb-16 lg:grid-cols-[0.85fr_1fr]">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-normal text-[#0d6b57]">Built for owner-operated teams</p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Useful on day one, ready for deeper booking sync later.</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <div className="rounded-lg border border-[#ded6ca] bg-[#fffaf1] p-4 font-bold text-[#38473f]" key={feature}>
              {feature}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
