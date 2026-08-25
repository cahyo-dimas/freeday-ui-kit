<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useFreeday, FdyCombo, FdyDatepicker, FdyDateRange, FdyAutocomplete, FdyCascade, FdyCfl } from '@cahyo-dimas/freeday/vue';
import type {
  CascadeNode,
  FdyCascadeChangeDetail,
  FdyDatepickerChangeDetail,
  FdyChangeDetail,
  FdyMaskDetail,
  DateRangeValue,
} from '@cahyo-dimas/freeday/vue';

// One call wires every [data-fdy-*] in this subtree after Vue renders it.
const root = ref<HTMLElement | null>(null);
useFreeday(root);

interface Faktur {
  pelanggan: string;
  email: string;
  po: string;
  poRaw: string;
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

const form = reactive<Faktur>({
  pelanggan: '',
  email: '',
  po: '',
  poRaw: '',
  kategori: '',
  kategoriPath: '',
  jatuhTempo: dueDefault(),
  status: 'draft',
});

const submitted = ref<Faktur | null>(null);

// Freeday events arrive as native bubbling CustomEvents, read event.detail.
const onCascade = (e: Event): void => {
  const d = (e as CustomEvent<FdyCascadeChangeDetail>).detail;
  form.kategori = d.value;
  form.kategoriPath = d.path;
};
const onDate = (e: Event): void => {
  form.jatuhTempo = (e as CustomEvent<FdyDatepickerChangeDetail>).detail.value;
};
const onStatus = (e: Event): void => {
  form.status = (e as CustomEvent<FdyChangeDetail>).detail.value;
};
const onPo = (e: Event): void => {
  const d = (e as CustomEvent<FdyMaskDetail>).detail;
  form.po = d.value;
  form.poRaw = d.raw;
};

const rupiah = (n: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const items = reactive([
  { desc: 'Jasa implementasi SAP B1', qty: 1, harga: 18_000_000 },
  { desc: 'Lisensi Freeday (tahunan)', qty: 3, harga: 1_200_000 },
  { desc: 'Pelatihan tim (per sesi)', qty: 2, harga: 850_000 },
]);
const total = computed(() => items.reduce((s, it) => s + it.qty * it.harga, 0));

const statusLabel: Record<string, string> = { draft: 'Draft', tertunda: 'Tertunda', lunas: 'Lunas' };

// FdyCombo demo. Vue-native v-model over `.fdy-combo`, alternative to the
// `data-fdy-combo` enhancer used for "Status" above.
type MetodePembayaran = 'transfer' | 'tunai' | 'kartu' | 'giro';
const metodeOptions: ReadonlyArray<{ value: MetodePembayaran; label: string }> = [
  { value: 'transfer', label: 'Transfer bank' },
  { value: 'tunai', label: 'Tunai' },
  { value: 'kartu', label: 'Kartu kredit' },
  { value: 'giro', label: 'Giro' },
];
const metode = ref<MetodePembayaran>('transfer');
const metodeInvalidDemo = ref<MetodePembayaran | ''>('');

// FdyDatepicker demo. Vue-native v-model over `.fdy-datepicker`, alternative to the
// `data-fdy-datepicker` enhancer used for "Jatuh tempo" above.
const tanggalKirim = ref<string | null>(dueDefault());
const tanggalTerbit: string = new Date().toISOString().slice(0, 10);
const tanggalTerbitMax: string = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
})();
const tanggalTerbitDemo = ref<string | null>(null);
const tanggalInvalidDemo = ref<string | null>(null);
const periode = ref<DateRangeValue>({ start: null, end: null });

// FdyAutocomplete demo, editable combobox; the component filters these client-side.
const kotaOptions: ReadonlyArray<string> = [
  'Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Semarang', 'Makassar', 'Yogyakarta', 'Denpasar',
];
const kota = ref<string>('');

// FdyCascade demo, the tree as typed data (replaces the enhancer's hidden nested <ul>).
const kategoriTree: ReadonlyArray<CascadeNode> = [
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
const kategoriVue = ref<string>('');

// FdyCfl demo. Vue-native, controlled *async* choose-from-list over `.fdy-cfl*`.
// Unblocks the "map an extracted value → SAP master data" gap: the caller supplies a
// `fetchPage(query, page)` that hits the server; here it's a mock over a static array
// (filter by query, slice by page, report `hasMore`) so the demo runs without a backend.
interface Pelanggan extends Record<string, unknown> {
  code: string;
  name: string;
  city: string;
}

const masterPelanggan: ReadonlyArray<Pelanggan> = [
  { code: 'C-1001', name: 'PT Sumber Makmur', city: 'Jakarta' },
  { code: 'C-1002', name: 'CV Berkah Jaya', city: 'Bandung' },
  { code: 'C-1003', name: 'UD Cahaya Abadi', city: 'Surabaya' },
  { code: 'C-1004', name: 'PT Mitra Sentosa', city: 'Semarang' },
  { code: 'C-1005', name: 'Toko Rejeki Makmur', city: 'Medan' },
  { code: 'C-1006', name: 'PT Anugerah Digital', city: 'Yogyakarta' },
  { code: 'C-1007', name: 'CV Karya Bersama', city: 'Denpasar' },
  { code: 'C-1008', name: 'PT Bina Sejahtera', city: 'Makassar' },
  { code: 'C-1009', name: 'UD Tani Subur', city: 'Malang' },
  { code: 'C-1010', name: 'PT Global Nusantara', city: 'Batam' },
];

const CFL_PAGE_SIZE = 4;

const fetchPelanggan = (query: string, page: number): Promise<{ rows: Pelanggan[]; hasMore: boolean }> => {
  const q = query.trim().toLowerCase();
  const matched = masterPelanggan.filter(
    (r) => q === '' || r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q),
  );
  const start = page * CFL_PAGE_SIZE;
  const slice = matched.slice(start, start + CFL_PAGE_SIZE);
  const hasMore = start + CFL_PAGE_SIZE < matched.length;
  // Simulate network latency so loading/pagination/out-of-order states are observable.
  return new Promise((resolve) => setTimeout(() => resolve({ rows: slice, hasMore }), 350));
};

const pelangganColumns: ReadonlyArray<{ key: keyof Pelanggan & string; label: string }> = [
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama' },
  { key: 'city', label: 'Kota' },
];
const pelangganDisplay = (row: Pelanggan): string => `${row.code} · ${row.name}`;
const pelangganKey = (row: Pelanggan): string => row.code;

const pelanggan = ref<Pelanggan | null>(null);
const pelangganInvalidDemo = ref<Pelanggan | null>(null);

const onValid = (): void => {
  submitted.value = { ...form };
  (window as unknown as { Freeday?: { toast: (o: Record<string, unknown>) => void } })
    .Freeday?.toast({
      variant: 'success',
      title: 'Faktur tersimpan',
      message: `${form.pelanggan} · ${rupiah(total.value)}`,
    });
};

const toggleTheme = (): void => {
  const el = document.documentElement;
  el.setAttribute('data-theme', el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
};
</script>

<template>
  <div class="fdy-app" ref="root">
    <aside class="fdy-app__sidebar" aria-label="Navigasi">
      <div class="fdy-app__brand">Freeday × Vue</div>
      <nav class="fdy-nav" aria-label="Menu">
        <a class="fdy-nav__item" href="#" aria-current="page">Faktur</a>
        <a class="fdy-nav__item" href="#">Pelanggan</a>
        <a class="fdy-nav__item" href="#">Produk</a>
        <a class="fdy-nav__item" href="#">Laporan</a>
      </nav>
    </aside>

    <div class="fdy-app__content">
      <header class="fdy-app__topbar">
        <h1 style="font-size:var(--text-lg);font-weight:var(--weight-semibold);margin:0">Faktur baru</h1>
        <button class="fdy-btn fdy-btn--ghost fdy-btn--sm" type="button" @click="toggleTheme">Tema</button>
      </header>

      <main class="fdy-app__main" style="display:flex;flex-direction:column;gap:var(--space-6);max-width:56rem">
        <section class="fdy-card">
          <div class="fdy-card__body">
            <h2 class="fdy-card__title" style="margin-bottom:var(--space-5)">Detail faktur</h2>

            <form data-fdy-validate @submit.prevent @fdy-form-valid="onValid"
                  style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-5)">

              <label class="fdy-field" style="max-width:none">
                <span class="fdy-label">Pelanggan <span aria-hidden="true" style="color:var(--color-danger)">*</span></span>
                <input class="fdy-input" name="pelanggan" v-model="form.pelanggan" required
                       data-fdy-msg-required="Nama pelanggan wajib diisi." placeholder="cth. PT Sumber Makmur">
              </label>

              <label class="fdy-field" style="max-width:none">
                <span class="fdy-label">Email <span aria-hidden="true" style="color:var(--color-danger)">*</span></span>
                <input class="fdy-input" name="email" type="email" v-model="form.email" required
                       data-fdy-msg-required="Email wajib diisi." data-fdy-msg-type="Format email tidak valid."
                       placeholder="nama@perusahaan.com">
              </label>

              <label class="fdy-field" style="max-width:none">
                <span class="fdy-label">No. PO <span aria-hidden="true" style="color:var(--color-danger)">*</span></span>
                <input class="fdy-input" name="po" data-fdy-mask="PO-####/AA" pattern="PO-\d{4}/[A-Za-z]{2}"
                       required data-fdy-msg-required="Nomor PO wajib diisi."
                       data-fdy-msg-pattern="Format: PO-2026/AB." placeholder="PO-2026/AB" @fdy-mask="onPo">
              </label>

              <div class="fdy-field" style="max-width:none">
                <span class="fdy-label">Kategori produk</span>
                <div data-fdy-cascade data-label="Kategori produk" data-placeholder="Pilih kategori" @fdy-cascade-change="onCascade">
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

              <div class="fdy-field" style="max-width:none">
                <span class="fdy-label">Jatuh tempo</span>
                <div data-fdy-datepicker :data-value="form.jatuhTempo" data-label="Jatuh tempo" @fdy-datepicker-change="onDate"></div>
              </div>

              <div class="fdy-field" style="max-width:none">
                <span class="fdy-label" id="lbl-status">Status</span>
                <div class="fdy-combo" data-fdy-combo data-value="draft" @fdy-change="onStatus">
                  <button type="button" class="fdy-combo__button" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="lbl-status val-status">
                    <span class="fdy-combo__value" id="val-status">Draft</span>
                  </button>
                  <ul class="fdy-combo__listbox" role="listbox" aria-labelledby="lbl-status" hidden>
                    <li class="fdy-combo__option" role="option" data-value="draft" aria-selected="true"><span class="fdy-combo__check">✓</span>Draft</li>
                    <li class="fdy-combo__option" role="option" data-value="tertunda" aria-selected="false"><span class="fdy-combo__check"></span>Tertunda</li>
                    <li class="fdy-combo__option" role="option" data-value="lunas" aria-selected="false"><span class="fdy-combo__check"></span>Lunas</li>
                  </ul>
                </div>
              </div>

              <div style="grid-column:1/-1;display:flex;gap:var(--space-3);margin-top:var(--space-2)">
                <button class="fdy-btn" type="submit">Simpan faktur</button>
                <span class="fdy-help" style="align-self:center">Bukti v0.9: markup Vue → enhancer Freeday lewat <code>useFreeday()</code>.</span>
              </div>
            </form>
          </div>
        </section>

        <section class="fdy-card">
          <div class="fdy-card__body">
            <h2 class="fdy-card__title" style="margin-bottom:var(--space-4)">Item</h2>
            <table class="fdy-table" style="width:100%">
              <thead>
                <tr><th>Deskripsi</th><th style="text-align:right">Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Subtotal</th></tr>
              </thead>
              <tbody>
                <tr v-for="(it, i) in items" :key="i">
                  <td>{{ it.desc }}</td>
                  <td style="text-align:right;font-variant-numeric:tabular-nums">{{ it.qty }}</td>
                  <td style="text-align:right;font-variant-numeric:tabular-nums">{{ rupiah(it.harga) }}</td>
                  <td style="text-align:right;font-variant-numeric:tabular-nums">{{ rupiah(it.qty * it.harga) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr><td colspan="3" style="text-align:right;font-weight:var(--weight-semibold)">Total</td>
                    <td style="text-align:right;font-weight:var(--weight-bold);font-variant-numeric:tabular-nums">{{ rupiah(total) }}</td></tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section class="fdy-card">
          <div class="fdy-card__body">
            <h2 class="fdy-card__title" style="margin-bottom:var(--space-2)">Vue-native combo (FdyCombo)</h2>
            <p class="fdy-help" style="margin:0 0 var(--space-4)">
              <code>&lt;FdyCombo v-model&gt;</code>, binding Vue asli di atas kelas <code>.fdy-combo</code>,
              alternatif dari enhancer <code>data-fdy-combo</code> yang dipakai untuk "Status" di atas.
            </p>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-5)">
              <label class="fdy-field" style="max-width:none">
                <span class="fdy-label" id="lbl-metode">Metode pembayaran</span>
                <FdyCombo v-model="metode" :options="metodeOptions" aria-labelledby="lbl-metode" placeholder="Pilih metode" />
              </label>

              <label class="fdy-field" style="max-width:none">
                <span class="fdy-label" id="lbl-metode-invalid">Metode pembayaran (contoh invalid)</span>
                <FdyCombo v-model="metodeInvalidDemo" :options="metodeOptions" aria-labelledby="lbl-metode-invalid"
                          placeholder="Wajib dipilih" invalid describedby="err-metode-invalid" />
                <span id="err-metode-invalid" class="fdy-help" style="color:var(--color-danger)">Metode pembayaran wajib dipilih.</span>
              </label>
            </div>
            <div class="fdy-field" style="max-width:none;margin-top:var(--space-4)">
              <span class="fdy-label" id="lbl-kota-vue">Kota (FdyAutocomplete)</span>
              <FdyAutocomplete v-model="kota" :options="kotaOptions" aria-labelledby="lbl-kota-vue" placeholder="Ketik kota…" />
              <span class="fdy-help">Nilai: {{ kota || '—' }}</span>
            </div>
            <div class="fdy-field" style="max-width:none;margin-top:var(--space-4)">
              <span class="fdy-label" id="lbl-kategori-vue">Kategori (FdyCascade)</span>
              <FdyCascade v-model="kategoriVue" :options="kategoriTree" aria-labelledby="lbl-kategori-vue"
                          label="Kategori produk" placeholder="Pilih kategori" />
              <span class="fdy-help">Nilai: {{ kategoriVue || '—' }}</span>
            </div>
          </div>
        </section>

        <section class="fdy-card">
          <div class="fdy-card__body">
            <h2 class="fdy-card__title" style="margin-bottom:var(--space-2)">Vue-native kalender (FdyDatepicker)</h2>
            <p class="fdy-help" style="margin:0 0 var(--space-4)">
              <code>&lt;FdyDatepicker v-model&gt;</code>, kalender native Vue di atas kelas <code>.fdy-datepicker</code>,
              alternatif dari enhancer <code>data-fdy-datepicker</code> yang dipakai untuk "Jatuh tempo" di atas.
            </p>
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-5)">
              <label class="fdy-field" style="max-width:none">
                <span class="fdy-label" id="lbl-kirim">Tanggal kirim</span>
                <FdyDatepicker v-model="tanggalKirim" id="dp-kirim" aria-labelledby="lbl-kirim" describedby="help-kirim" />
                <span id="help-kirim" class="fdy-help">Nilai awal: {{ tanggalKirim }}</span>
              </label>

              <label class="fdy-field" style="max-width:none">
                <span class="fdy-label" id="lbl-terbit">Tanggal terbit (min/max 30 hari)</span>
                <FdyDatepicker v-model="tanggalTerbitDemo" :min="tanggalTerbit" :max="tanggalTerbitMax" aria-labelledby="lbl-terbit" placeholder="Pilih dalam 30 hari" />
              </label>

              <label class="fdy-field" style="max-width:none">
                <span class="fdy-label" id="lbl-invalid-tanggal">Tanggal jatuh tempo (contoh invalid)</span>
                <FdyDatepicker v-model="tanggalInvalidDemo" aria-labelledby="lbl-invalid-tanggal" placeholder="Wajib dipilih" invalid describedby="err-tanggal-invalid" />
                <span id="err-tanggal-invalid" class="fdy-help" style="color:var(--color-danger)">Tanggal jatuh tempo wajib diisi.</span>
              </label>
            </div>
            <div class="fdy-field" style="max-width:none;margin-top:var(--space-4)">
              <span class="fdy-label" id="lbl-periode-vue">Periode laporan (FdyDateRange)</span>
              <FdyDateRange v-model="periode" aria-labelledby="lbl-periode-vue" />
              <span class="fdy-help">Nilai: {{ periode.start ?? '—' }} s/d {{ periode.end ?? '—' }}</span>
            </div>
          </div>
        </section>

        <section class="fdy-card">
          <div class="fdy-card__body">
            <h2 class="fdy-card__title" style="margin-bottom:var(--space-2)">Vue-native choose-from-list (FdyCfl)</h2>
            <p class="fdy-help" style="margin:0 0 var(--space-4)">
              <code>&lt;FdyCfl v-model&gt;</code>, pemilih master data <em>async</em> terkontrol di atas kelas <code>.fdy-cfl*</code>.
              Klik kaca pembesar → dialog memanggil <code>fetchPage(query, page)</code> (di sini mock berlatensi), dengan
              pencarian ter-debounce, paginasi "muat lebih banyak", dan status memuat/kosong/error.
            </p>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-5)">
              <label class="fdy-field" style="max-width:none">
                <span class="fdy-label" id="lbl-pelanggan">Pelanggan</span>
                <FdyCfl
                  v-model="pelanggan"
                  :fetch-page="fetchPelanggan"
                  :columns="pelangganColumns"
                  :display="pelangganDisplay"
                  :row-key="pelangganKey"
                  aria-labelledby="lbl-pelanggan"
                  placeholder="Pilih pelanggan…"
                  describedby="help-pelanggan"
                />
                <span id="help-pelanggan" class="fdy-help">Terpilih: {{ pelanggan ? pelangganDisplay(pelanggan) : '—' }}</span>
              </label>

              <label class="fdy-field" style="max-width:none">
                <span class="fdy-label" id="lbl-pelanggan-invalid">Pelanggan (contoh invalid)</span>
                <FdyCfl
                  v-model="pelangganInvalidDemo"
                  :fetch-page="fetchPelanggan"
                  :columns="pelangganColumns"
                  :display="pelangganDisplay"
                  :row-key="pelangganKey"
                  aria-labelledby="lbl-pelanggan-invalid"
                  placeholder="Wajib dipilih"
                  invalid
                  describedby="err-pelanggan-invalid"
                />
                <span id="err-pelanggan-invalid" class="fdy-help" style="color:var(--color-danger)">Pelanggan wajib dipilih.</span>
              </label>
            </div>
          </div>
        </section>

        <section v-if="submitted" class="fdy-card" aria-live="polite">
          <div class="fdy-card__body">
            <h2 class="fdy-card__title" style="margin-bottom:var(--space-4)">Tersimpan (state Vue)</h2>
            <dl class="fdy-dl">
              <dt>Pelanggan</dt><dd>{{ submitted.pelanggan }}</dd>
              <dt>Email</dt><dd>{{ submitted.email }}</dd>
              <dt>No. PO</dt><dd>{{ submitted.po || '—' }}</dd>
              <dt>Kategori</dt><dd>{{ submitted.kategoriPath || '—' }} <span v-if="submitted.kategori">({{ submitted.kategori }})</span></dd>
              <dt>Jatuh tempo</dt><dd>{{ submitted.jatuhTempo }}</dd>
              <dt>Status</dt><dd><span class="fdy-badge" :class="submitted.status === 'lunas' ? 'fdy-badge--success' : 'fdy-badge--outline'">{{ statusLabel[submitted.status] ?? submitted.status }}</span></dd>
              <dt>Total</dt><dd>{{ rupiah(total) }}</dd>
            </dl>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
