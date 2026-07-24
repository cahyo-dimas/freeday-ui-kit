import { useRef, useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { useFreeday, FdyCombo, FdyDatepicker, FdyDateRange, FdyAutocomplete, FdyCascade, FdyCfl, FdyChart } from 'freeday/react';
import type {
  FdyMaskDetail,
  FdyComboOption,
  CflColumn,
  CflPage,
  DateRangeValue,
  CascadeNode,
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

type InvoiceStatus = 'draft' | 'tertunda' | 'lunas';

// `extends Record<string, unknown>` satisfies FdyCfl's `Row extends Record<string, unknown>`
// constraint — same pattern the Vue example's `Pelanggan` interface uses.
interface Customer extends Record<string, unknown> {
  id: string;
  nama: string;
  kota: string;
  email: string;
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
// 7 days of recent invoice totals (in millions), for the sparkline demo below.
const trendValues = [12, 9, 14, 11, 18, 15, 21];

// Suggestions for the FdyAutocomplete demo — the component filters them client-side.
const kotaOptions: ReadonlyArray<string> = [
  'Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Semarang', 'Makassar', 'Yogyakarta', 'Denpasar',
];

// The cascade tree as typed data — replaces the enhancer's hidden nested <ul>.
const kategoriOptions: ReadonlyArray<CascadeNode> = [
  { label: 'Jasa', value: 'jasa', children: [
    { label: 'Implementasi', value: 'implementasi' },
    { label: 'Pelatihan', value: 'pelatihan' },
  ] },
  { label: 'Lisensi', value: 'lisensi', children: [
    { label: 'Tahunan', value: 'tahunan' },
    { label: 'Perpetual', value: 'perpetual' },
  ] },
  { label: 'Barang', value: 'barang' },
];

const statusOptions: ReadonlyArray<FdyComboOption<InvoiceStatus>> = [
  { value: 'draft', label: 'Draft' },
  { value: 'tertunda', label: 'Tertunda' },
  { value: 'lunas', label: 'Lunas' },
];

// Mock customer master (stands in for a Business Partner lookup) — filtered/paged locally by
// FdyCfl's fetchPage contract instead of a real API call.
const customers: Customer[] = [
  { id: 'C-001', nama: 'PT Sumber Makmur', kota: 'Jakarta', email: 'ap@sumbermakmur.co.id' },
  { id: 'C-002', nama: 'CV Cahaya Abadi', kota: 'Surabaya', email: 'finance@cahayaabadi.co.id' },
  { id: 'C-003', nama: 'PT Mitra Sejahtera', kota: 'Bandung', email: 'ar@mitrasejahtera.co.id' },
  { id: 'C-004', nama: 'UD Berkah Jaya', kota: 'Semarang', email: 'admin@berkahjaya.co.id' },
  { id: 'C-005', nama: 'PT Nusantara Prima', kota: 'Jakarta', email: 'billing@nusantaraprima.co.id' },
  { id: 'C-006', nama: 'CV Sinar Terang', kota: 'Medan', email: 'ap@sinarterang.co.id' },
  { id: 'C-007', nama: 'PT Karya Utama', kota: 'Yogyakarta', email: 'finance@karyautama.co.id' },
  { id: 'C-008', nama: 'PT Global Teknindo', kota: 'Jakarta', email: 'ar@globalteknindo.co.id' },
  { id: 'C-009', nama: 'CV Maju Bersama', kota: 'Makassar', email: 'admin@majubersama.co.id' },
  { id: 'C-010', nama: 'PT Andalan Sukses', kota: 'Surabaya', email: 'ap@andalansukses.co.id' },
  { id: 'C-011', nama: 'UD Sentosa Abadi', kota: 'Denpasar', email: 'finance@sentosaabadi.co.id' },
  { id: 'C-012', nama: 'PT Cipta Mandiri', kota: 'Bandung', email: 'billing@ciptamandiri.co.id' },
  { id: 'C-013', nama: 'CV Harapan Baru', kota: 'Palembang', email: 'ar@harapanbaru.co.id' },
  { id: 'C-014', nama: 'PT Pilar Jaya', kota: 'Jakarta', email: 'ap@pilarjaya.co.id' },
  { id: 'C-015', nama: 'PT Fajar Sejahtera', kota: 'Semarang', email: 'admin@fajarsejahtera.co.id' },
  { id: 'C-016', nama: 'CV Bintang Timur', kota: 'Malang', email: 'finance@bintangtimur.co.id' },
  { id: 'C-017', nama: 'PT Sumber Makmur Dua', kota: 'Surabaya', email: 'ap2@sumbermakmur.co.id' },
  { id: 'C-018', nama: 'UD Rejeki Lancar', kota: 'Jakarta', email: 'billing@rejekilancar.co.id' },
];

const customerColumns: ReadonlyArray<CflColumn<Customer>> = [
  { key: 'nama', label: 'Nama' },
  { key: 'kota', label: 'Kota' },
  { key: 'email', label: 'Email' },
];

const CUSTOMER_PAGE_SIZE = 8;

// Local mock in place of a real Business Partner search endpoint — filters + pages the
// in-file array and resolves like a network call would (FdyCfl's fetchPage contract).
const fetchCustomers = (query: string, page: number): Promise<CflPage<Customer>> => {
  const q = query.trim().toLowerCase();
  const filtered = q === ''
    ? customers
    : customers.filter((c) => c.nama.toLowerCase().includes(q) || c.kota.toLowerCase().includes(q));
  const start = page * CUSTOMER_PAGE_SIZE;
  const rows = filtered.slice(start, start + CUSTOMER_PAGE_SIZE);
  const hasMore = start + CUSTOMER_PAGE_SIZE < filtered.length;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ rows, hasMore }), 150);
  });
};

export function App(): ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useFreeday(root); // hydrate [data-fdy-*] in this subtree on mount + every commit

  // Values that arrive via fdy-* events (the enhancers still own that DOM) live in a ref.
  const live = useRef({ kategori: '', kategoriPath: '', jatuhTempo: dueDefault(), status: 'draft' as InvoiceStatus, poRaw: '' });
  const [submitted, setSubmitted] = useState<Faktur | null>(null);

  // Fully-controlled React components — plain useState, no DOM events to bridge.
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [jatuhTempo, setJatuhTempo] = useState<string>(dueDefault());
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [periode, setPeriode] = useState<DateRangeValue>({ start: null, end: null });
  const [kota, setKota] = useState<string>('');
  const [kategori, setKategori] = useState<string>('');
  const [kategoriPath, setKategoriPath] = useState<string>('');

  // The submit handler below is registered once (mount-only effect) and reads `live.current`,
  // so mirror the controlled state into it on every change to avoid a stale closure.
  useEffect(() => { live.current.status = status; }, [status]);
  useEffect(() => { live.current.jatuhTempo = jatuhTempo; }, [jatuhTempo]);
  useEffect(() => { live.current.kategori = kategori; }, [kategori]);
  useEffect(() => { live.current.kategoriPath = kategoriPath; }, [kategoriPath]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // fdy-* events bubble, so one set of listeners on the root covers every control.
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
    el.addEventListener('fdy-mask', onPo);
    el.addEventListener('fdy-form-valid', onValid);
    return () => {
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
                <div className="fdy-field faktur-field">
                  <span className="fdy-label" id="lbl-customer">Cari pelanggan</span>
                  <FdyCfl<Customer>
                    value={customer}
                    onChange={(row) => {
                      setCustomer(row);
                      // Autofill the plain-text fields below — the search picker complements
                      // manual entry rather than replacing the required native inputs.
                      const form = formRef.current;
                      if (form === null) return;
                      const pelangganInput = form.elements.namedItem('pelanggan') as HTMLInputElement;
                      pelangganInput.value = row.nama;
                      pelangganInput.dispatchEvent(new Event('input', { bubbles: true }));
                      const emailInput = form.elements.namedItem('email') as HTMLInputElement;
                      emailInput.value = row.email;
                      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }}
                    fetchPage={fetchCustomers}
                    columns={customerColumns}
                    display={(row) => row.nama}
                    rowKey={(row) => row.id}
                    placeholder="Cari nama atau kota…"
                    ariaLabelledby="lbl-customer"
                  />
                  {customer && <span className="fdy-help">{customer.kota} · {customer.email}</span>}
                </div>

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
                  <span className="fdy-label" id="lbl-kategori">Kategori produk</span>
                  <FdyCascade
                    value={kategori}
                    onChange={(v: string, labels: string[]): void => { setKategori(v); setKategoriPath(labels.join(' / ')); }}
                    options={kategoriOptions}
                    label="Kategori produk"
                    ariaLabelledby="lbl-kategori"
                    placeholder="Pilih kategori"
                  />
                </div>

                <div className="fdy-field faktur-field">
                  <span className="fdy-label" id="lbl-jatuh-tempo">Jatuh tempo</span>
                  <FdyDatepicker
                    value={jatuhTempo}
                    onChange={setJatuhTempo}
                    ariaLabelledby="lbl-jatuh-tempo"
                  />
                </div>

                <div className="fdy-field faktur-field">
                  <span className="fdy-label" id="lbl-periode">Periode laporan</span>
                  <FdyDateRange
                    value={periode}
                    onChange={setPeriode}
                    ariaLabelledby="lbl-periode"
                    startPlaceholder="Dari"
                    endPlaceholder="Sampai"
                  />
                </div>

                <div className="fdy-field faktur-field">
                  <span className="fdy-label" id="lbl-kota">Kota</span>
                  <FdyAutocomplete
                    value={kota}
                    onChange={setKota}
                    options={kotaOptions}
                    ariaLabelledby="lbl-kota"
                    placeholder="Ketik kota…"
                  />
                </div>

                <div className="fdy-field faktur-field">
                  <span className="fdy-label" id="lbl-status">Status</span>
                  <FdyCombo<InvoiceStatus>
                    value={status}
                    options={statusOptions}
                    onChange={setStatus}
                    ariaLabelledby="lbl-status"
                  />
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <h2 className="fdy-card__title" style={{ marginBottom: 0 }}>Item</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span className="fdy-help">Tren 7 hari</span>
                  <FdyChart type="sparkline" values={trendValues} aria-label="Tren total faktur 7 hari terakhir" />
                </div>
              </div>
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
