# Freeday × Blazor (WASM): invoice example

A real invoice screen in Blazor WebAssembly that uses Freeday components through the
`freeday-blazor.js` interop. Blazor-rendered markup is enhanced by Freeday's enhancers, and `fdy-*`
events are forwarded to C# `[JSInvokable]` methods that update component state.

> **Want to use Freeday in your own Blazor project?** Follow
> [`../../docs/getting-started.md`](../../docs/getting-started.md) §Blazor (WASM), copy the assets
> into `wwwroot/freeday/` (manually or via the MSBuild target).

## Run

```bash
cd examples/blazor-faktur
dotnet run          # open the URL it prints (e.g. http://localhost:5xxx)
```

Needs the **.NET 10 SDK**. The Freeday assets (`dist/freeday.bundle.css`, `dist/freeday.js`, and
`adapters/blazor/freeday-blazor.js`) are copied into `wwwroot/freeday/` automatically at build time
(see the `CopyFreedayAssets` target in the `.csproj`); that folder is gitignored.

## Core pattern (code-behind, `Pages/Faktur.razor` + `Faktur.razor.cs`)

`freeday-blazor.js` is loaded as a plain script (it registers `window.FreedayBlazor`), then called
through `IJSRuntime`:

```csharp
protected override async Task OnAfterRenderAsync(bool firstRender)
{
    if (!firstRender) return;
    await JS.InvokeVoidAsync("FreedayBlazor.initAll", _root);          // hydrate the enhancers
    _self = DotNetObjectReference.Create(this);
    _tokens.Add(await JS.InvokeAsync<int>(
        "FreedayBlazor.on", _root, "fdy-cascade-change", _self, nameof(OnCascade)));
}

[JSInvokable] public void OnCascade(CascadeDetail d) { _category = d.Value; StateHasChanged(); }
```

`FreedayBlazor.on(...)` returns a token; call `FreedayBlazor.off(token)` in `DisposeAsync`. Event
details are sent JSON-safe (Blazor deserializes them into a record, case-insensitive).

## Integration notes

- **Text inputs** bound with `@bind` (customer, email) are safe, since no enhancer touches them.
- **Masked fields / widgets** (`data-fdy-*`) are left without `@bind`: the enhancer owns their DOM
  value. The widget markup is static, so Blazor's diff won't overwrite the nodes the enhancer added.
- Validation is driven by `freeday-form`; submit is gated through the `fdy-form-valid` event
  (`@onsubmit:preventDefault` holds navigation).

The enhancer stays the source of truth; nothing is re-implemented. See
[`../../docs/integrations.md`](../../docs/integrations.md) for the library map and other patterns.
