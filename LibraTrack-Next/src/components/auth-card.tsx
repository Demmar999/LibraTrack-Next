import { Icon } from "./icons";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-brand">
            <Icon name="logo" size={22} />
          </span>
          <span className="text-2xl font-extrabold">LibraTrack</span>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">
            Library Resource Management
            <br />
            and Analytics System
          </h2>
          <ul className="mt-6 grid gap-3 text-white/80">
            {[
              "Borrow, return, reserve and renew books",
              "Fines calculated automatically",
              "Dashboards and PDF / Excel reports",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Icon name="success" size={18} className="text-brand" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/50"></p>
        <span className="absolute -bottom-24 -right-24 size-72 rounded-full bg-ocean/40" />
        <span className="absolute -top-10 right-24 size-32 rounded-full bg-sun/30" />
      </div>
      <div className="grid place-items-center p-5">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-line sm:p-8">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-navy text-white">
              <Icon name="logo" size={20} />
            </span>
            <span className="text-xl font-extrabold text-navy">LibraTrack</span>
          </div>
          <h1 className="text-2xl font-extrabold text-navy">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
