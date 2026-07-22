# Foundry × Blazor (WASM) — contoh Faktur

Bukti **v0.9**: layar faktur nyata di Blazor WebAssembly yang memakai komponen Foundry lewat
interop `foundry-blazor.js`. Markup yang dirender Blazor di-*enhance* oleh enhancer Foundry,
dan event `fdy-*` diteruskan ke method `[JSInvokable]` C# → memperbarui state komponen.

## Jalankan

```bash
cd examples/blazor-faktur
dotnet run          # buka URL yang ditampilkan (mis. http://localhost:5xxx)
```

Butuh **.NET 10 SDK**. Aset Foundry (`dist/foundry.bundle.css`, `dist/foundry.js`, dan
`adapters/blazor/foundry-blazor.js`) disalin otomatis ke `wwwroot/foundry/` saat build (lihat
target `CopyFoundryAssets` di `.csproj`); folder itu di-gitignore.

## Pola inti (code-behind, `Pages/Faktur.razor` + `Faktur.razor.cs`)

`foundry-blazor.js` dimuat sebagai script biasa (mendaftarkan `window.FoundryBlazor`), lalu
dipanggil via `IJSRuntime`:

```csharp
protected override async Task OnAfterRenderAsync(bool firstRender)
{
    if (!firstRender) return;
    await JS.InvokeVoidAsync("FoundryBlazor.initAll", _root);          // hydrate enhancer
    _self = DotNetObjectReference.Create(this);
    _tokens.Add(await JS.InvokeAsync<int>(
        "FoundryBlazor.on", _root, "fdy-cascade-change", _self, nameof(OnCascade)));
}

[JSInvokable] public void OnCascade(CascadeDetail d) { _kategori = d.Value; StateHasChanged(); }
```

`FoundryBlazor.on(...)` mengembalikan token; panggil `FoundryBlazor.off(token)` di
`DisposeAsync`. Detail event dikirim JSON-safe (Blazor deserialisasi ke record, case-insensitive).

## Catatan integrasi

- **Input teks** yang di-`@bind` (pelanggan, email) aman — tak ada enhancer yang menyentuhnya.
- **Field ber-mask / widget** (`data-fdy-*`) dibiarkan tanpa `@bind`: enhancer yang memiliki
  nilai DOM-nya. Markup widget bersifat statis, jadi diff Blazor tak menimpa node yang
  ditambahkan enhancer.
- Validasi digerakkan `foundry-form`; submit di-gate lewat event `fdy-form-valid`
  (`@onsubmit:preventDefault` menahan navigasi).

Enhancer tetap sumber kebenaran — tak ada re-implementasi. Lihat
[`../../docs/integrations.md`](../../docs/integrations.md) untuk peta library & pola lainnya.
