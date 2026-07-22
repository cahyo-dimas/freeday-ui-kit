# Freeday × Blazor (WASM) — contoh Faktur

Bukti **v0.9**: layar faktur nyata di Blazor WebAssembly yang memakai komponen Freeday lewat
interop `freeday-blazor.js`. Markup yang dirender Blazor di-*enhance* oleh enhancer Freeday,
dan event `fdy-*` diteruskan ke method `[JSInvokable]` C# → memperbarui state komponen.

> **Mau pakai Freeday di project Blazor-mu sendiri?** Ikuti panduan
> [`../../docs/getting-started.md`](../../docs/getting-started.md) §Blazor (WASM) — salin aset ke
> `wwwroot/freeday/` (manual atau via MSBuild target).

## Jalankan

```bash
cd examples/blazor-faktur
dotnet run          # buka URL yang ditampilkan (mis. http://localhost:5xxx)
```

Butuh **.NET 10 SDK**. Aset Freeday (`dist/freeday.bundle.css`, `dist/freeday.js`, dan
`adapters/blazor/freeday-blazor.js`) disalin otomatis ke `wwwroot/freeday/` saat build (lihat
target `CopyFreedayAssets` di `.csproj`); folder itu di-gitignore.

## Pola inti (code-behind, `Pages/Faktur.razor` + `Faktur.razor.cs`)

`freeday-blazor.js` dimuat sebagai script biasa (mendaftarkan `window.FreedayBlazor`), lalu
dipanggil via `IJSRuntime`:

```csharp
protected override async Task OnAfterRenderAsync(bool firstRender)
{
    if (!firstRender) return;
    await JS.InvokeVoidAsync("FreedayBlazor.initAll", _root);          // hydrate enhancer
    _self = DotNetObjectReference.Create(this);
    _tokens.Add(await JS.InvokeAsync<int>(
        "FreedayBlazor.on", _root, "fdy-cascade-change", _self, nameof(OnCascade)));
}

[JSInvokable] public void OnCascade(CascadeDetail d) { _kategori = d.Value; StateHasChanged(); }
```

`FreedayBlazor.on(...)` mengembalikan token; panggil `FreedayBlazor.off(token)` di
`DisposeAsync`. Detail event dikirim JSON-safe (Blazor deserialisasi ke record, case-insensitive).

## Catatan integrasi

- **Input teks** yang di-`@bind` (pelanggan, email) aman — tak ada enhancer yang menyentuhnya.
- **Field ber-mask / widget** (`data-fdy-*`) dibiarkan tanpa `@bind`: enhancer yang memiliki
  nilai DOM-nya. Markup widget bersifat statis, jadi diff Blazor tak menimpa node yang
  ditambahkan enhancer.
- Validasi digerakkan `freeday-form`; submit di-gate lewat event `fdy-form-valid`
  (`@onsubmit:preventDefault` menahan navigasi).

Enhancer tetap sumber kebenaran — tak ada re-implementasi. Lihat
[`../../docs/integrations.md`](../../docs/integrations.md) untuk peta library & pola lainnya.
