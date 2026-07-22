<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useFreeday } from 'freeday/vue';
import type {
  FdyCascadeChangeDetail,
  FdyDatepickerChangeDetail,
  FdyChangeDetail,
  FdyMaskDetail,
} from 'freeday/vue';

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

// Freeday events arrive as native bubbling CustomEvents — read event.detail.
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
