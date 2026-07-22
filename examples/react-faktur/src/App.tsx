import { useRef, useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { useFreeday } from 'freeday/react';
import type {
  FdyCascadeChangeDetail,
  FdyDatepickerChangeDetail,
  FdyChangeDetail,
  FdyMaskDetail,
} from 'freeday/react';
import './app.css';

interface Faktur {
  pelanggan: string;
  email: string;
  po: string;
  kategori: string;
  kategoriPath: string;
  jatuhTempo: string;
  status: string;
}

const dueDefault = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};
const rupiah = (n: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const items = [
  { desc: 'Jasa implementasi SAP B1', qty: 1, harga: 18_000_000 },
  { desc: 'Lisensi Freeday (tahunan)', qty: 3, harga: 1_200_000 },
  { desc: 'Pelatihan tim (per sesi)', qty: 2, harga: 850_000 },
];
const total = items.reduce((s, it) => s + it.qty * it.harga, 0);
const statusLabel: Record<string, string> = { draft: 'Draft', tertunda: 'Tertunda', lunas: 'Lunas' };

export function App(): ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useFreeday(root); // hydrate [data-fdy-*] in this subtree on mount + every commit

  // Values that arrive via fdy-* events live in a ref (the enhancers own the DOM).
  const live = useRef({ kategori: '', kategoriPath: '', jatuhTempo: dueDefault(), status: 'draft', poRaw: '' });
  const [submitted, setSubmitted] = useState<Faktur | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // fdy-* events bubble, so one set of listeners on the root covers every control.
    const onCascade = (e: Event): void => {
      const d = (e as CustomEvent<FdyCascadeChangeDetail>).detail;
      live.current.kategori = d.value;
      live.current.kategoriPath = d.path;
    };
    const onDate = (e: Event): void => { live.current.jatuhTempo = (e as CustomEvent<FdyDatepickerChangeDetail>).detail.value; };
    const onStatus = (e: Event): void => { live.current.status = (e as CustomEvent<FdyChangeDetail>).detail.value; };
    const onPo = (e: Event): void => { live.current.poRaw = (e as CustomEvent<FdyMaskDetail>).detail.raw; };
    const onValid = (): void => {
      const fd = new FormData(formRef.current!);
      const rec: Faktur = {
        pelanggan: String(fd.get('pelanggan') ?? ''),
        email: String(fd.get('email') ?? ''),
        po: String(fd.get('po') ?? ''),
        kategori: live.current.kategori,
        kategoriPath: live.current.kategoriPath,
        jatuhTempo: live.current.jatuhTempo,
        status: live.current.status,
      };
      setSubmitted(rec);
      (window as unknown as { Freeday?: { toast: (o: Record<string, unknown>) => void } })
        .Freeday?.toast({ variant: 'success', title: 'Faktur tersimpan', message: `${rec.pelanggan} · ${rupiah(total)}` });
    };
    el.addEventListener('fdy-cascade-change', onCascade);
    el.addEventListener('fdy-datepicker-change', onDate);
    el.addEventListener('fdy-change', onStatus);
    el.addEventListener('fdy-mask', onPo);
    el.addEventListener('fdy-form-valid', onValid);
    return () => {
      el.removeEventListener('fdy-cascade-change', onCascade);
      el.removeEventListener('fdy-datepicker-change', onDate);
      el.removeEventListener('fdy-change', onStatus);
      el.removeEventListener('fdy-mask', onPo);
      el.removeEventListener('fdy-form-valid', onValid);
    };
  }, []);

  const toggleTheme = (): void => {
    const el = document.documentElement;
    el.setAttribute('data-theme', el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="fdy-app" ref={root}>
      <aside className="fdy-app__sidebar" aria-label="Navigasi">
        <div className="fdy-app__brand">Freeday × React</div>
        <nav className="fdy-nav" aria-label="Menu">
          <a className="fdy-nav__item" href="#" aria-current="page">Faktur</a>
          <a className="fdy-nav__item" href="#">Pelanggan</a>
          <a className="fdy-nav__item" href="#">Produk</a>
          <a className="fdy-nav__item" href="#">Laporan</a>
        </nav>
      </aside>

      <div className="fdy-app__content">
        <header className="fdy-app__topbar">
          <h1 className="faktur-title">Faktur baru</h1>
          <button className="fdy-btn fdy-btn--ghost fdy-btn--sm" type="button" onClick={toggleTheme}>Tema</button>
        </header>

        <main className="fdy-app__main faktur-main">
          <section className="fdy-card">
            <div className="fdy-card__body">
              <h2 className="fdy-card__title" style={{ marginBottom: 'var(--space-5)' }}>Detail faktur</h2>

              <form data-fdy-validate ref={formRef} onSubmit={(e) => e.preventDefault()} className="faktur-form">
                <label className="fdy-field faktur-field">
                  <span className="fdy-label">Pelanggan <span aria-hidden="true" className="req">*</span></span>
                  <input className="fdy-input" name="pelanggan" required data-fdy-msg-required="Nama pelanggan wajib diisi." placeholder="cth. PT Sumber Makmur" />
                </label>

                <label className="fdy-field faktur-field">
                  <span className="fdy-label">Email <span aria-hidden="true" className="req">*</span></span>
                  <input className="fdy-input" name="email" type="email" required data-fdy-msg-required="Email wajib diisi." data-fdy-msg-type="Format email tidak valid." placeholder="nama@perusahaan.com" />
                </label>

                <label className="fdy-field faktur-field">
                  <span className="fdy-label">No. PO <span aria-hidden="true" className="req">*</span></span>
                  <input className="fdy-input" name="po" data-fdy-mask="PO-####/AA" pattern="PO-\d{4}/[A-Za-z]{2}" required data-fdy-msg-required="Nomor PO wajib diisi." data-fdy-msg-pattern="Format: PO-2026/AB." placeholder="PO-2026/AB" />
                </label>

                <div className="fdy-field faktur-field">
                  <span className="fdy-label">Kategori produk</span>
                  <div data-fdy-cascade data-label="Kategori produk" data-placeholder="Pilih kategori">
                    <ul>
                      <li data-value="jasa">Jasa
                        <ul>
                          <li data-value="implementasi">Implementasi</li>
                          <li data-value="pelatihan">Pelatihan</li>
                        </ul>
                      </li>
                      <li data-value="lisensi">Lisensi
                        <ul>
                          <li data-value="tahunan">Tahunan</li>
                          <li data-value="perpetual">Perpetual</li>
                        </ul>
                      </li>
                      <li data-value="barang">Barang</li>
                    </ul>
                  </div>
                </div>

                <div className="fdy-field faktur-field">
                  <span className="fdy-label">Jatuh tempo</span>
                  <div data-fdy-datepicker data-value={live.current.jatuhTempo} data-label="Jatuh tempo"></div>
                </div>

                <div className="fdy-field faktur-field">
                  <span className="fdy-label" id="lbl-status">Status</span>
                  <div className="fdy-combo" data-fdy-combo data-value="draft">
                    <button type="button" className="fdy-combo__button" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="lbl-status val-status">
                      <span className="fdy-combo__value" id="val-status">Draft</span>
                    </button>
                    <ul className="fdy-combo__listbox" role="listbox" aria-labelledby="lbl-status" hidden>
                      <li className="fdy-combo__option" role="option" data-value="draft" aria-selected="true"><span className="fdy-combo__check">✓</span>Draft</li>
                      <li className="fdy-combo__option" role="option" data-value="tertunda" aria-selected="false"><span className="fdy-combo__check"></span>Tertunda</li>
                      <li className="fdy-combo__option" role="option" data-value="lunas" aria-selected="false"><span className="fdy-combo__check"></span>Lunas</li>
                    </ul>
                  </div>
                </div>

                <div className="faktur-actions">
                  <button className="fdy-btn" type="submit">Simpan faktur</button>
                  <span className="fdy-help">Bukti v0.9: markup React → enhancer Freeday lewat <code>useFreeday()</code>.</span>
                </div>
              </form>
            </div>
          </section>

          <section className="fdy-card">
            <div className="fdy-card__body">
              <h2 className="fdy-card__title" style={{ marginBottom: 'var(--space-4)' }}>Item</h2>
              <table className="fdy-table" style={{ width: '100%' }}>
                <thead>
                  <tr><th>Deskripsi</th><th className="num">Qty</th><th className="num">Harga</th><th className="num">Subtotal</th></tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.desc}</td>
                      <td className="num">{it.qty}</td>
                      <td className="num">{rupiah(it.harga)}</td>
                      <td className="num">{rupiah(it.qty * it.harga)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3} className="num strong">Total</td><td className="num strong">{rupiah(total)}</td></tr>
                </tfoot>
              </table>
            </div>
          </section>

          {submitted && (
            <section className="fdy-card" aria-live="polite">
              <div className="fdy-card__body">
                <h2 className="fdy-card__title" style={{ marginBottom: 'var(--space-4)' }}>Tersimpan (state React)</h2>
                <dl className="fdy-dl">
                  <dt>Pelanggan</dt><dd>{submitted.pelanggan}</dd>
                  <dt>Email</dt><dd>{submitted.email}</dd>
                  <dt>No. PO</dt><dd>{submitted.po || '—'}</dd>
                  <dt>Kategori</dt><dd>{submitted.kategoriPath || '—'}{submitted.kategori && ` (${submitted.kategori})`}</dd>
                  <dt>Jatuh tempo</dt><dd>{submitted.jatuhTempo}</dd>
                  <dt>Status</dt><dd><span className={`fdy-badge ${submitted.status === 'lunas' ? 'fdy-badge--success' : 'fdy-badge--outline'}`}>{statusLabel[submitted.status] ?? submitted.status}</span></dd>
                  <dt>Total</dt><dd>{rupiah(total)}</dd>
                </dl>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
