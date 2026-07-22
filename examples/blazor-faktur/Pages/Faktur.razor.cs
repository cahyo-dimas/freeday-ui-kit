using System.Globalization;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace FreedayBlazorFaktur.Pages;

// Code-behind for the faktur screen. The Freeday enhancers own the DOM widgets
// (cascade, combo, date picker, mask, form validation); this class only bridges
// their fdy-* events to Blazor state via the freeday-blazor.js interop module.
public partial class Faktur : ComponentBase, IAsyncDisposable
{
    [Inject] private IJSRuntime JS { get; set; } = default!;

    private ElementReference _root;
    private DotNetObjectReference<Faktur>? _self;
    private readonly List<int> _tokens = new();
    private readonly string _dueDefault = DateTime.Today.AddDays(14).ToString("yyyy-MM-dd");

    // Bound text fields (no enhancer touches these).
    private string _pelanggan = string.Empty;
    private string _email = string.Empty;

    // Values that arrive through fdy-* events.
    private string _po = string.Empty;
    private string _kategori = string.Empty;
    private string _kategoriPath = string.Empty;
    private string _jatuhTempo = string.Empty;
    private string _status = "draft";

    private FakturData? _submitted;

    private static readonly (string Desc, int Qty, long Harga)[] Items =
    {
        ("Jasa implementasi SAP B1", 1, 18_000_000),
        ("Lisensi Freeday (tahunan)", 3, 1_200_000),
        ("Pelatihan tim (per sesi)", 2, 850_000),
    };
    private static long Total => Items.Sum(i => (long)i.Qty * i.Harga);
    private static string Rupiah(long n) => "Rp " + n.ToString("#,0", CultureInfo.InvariantCulture).Replace(",", ".");
    private static string StatusText(string s) => s switch
    {
        "draft" => "Draft",
        "tertunda" => "Tertunda",
        "lunas" => "Lunas",
        _ => s,
    };

    protected override void OnInitialized() => _jatuhTempo = _dueDefault;

    private void Noop() { } // form submit is gated by freeday-form -> fdy-form-valid

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;
        await JS.InvokeVoidAsync("FreedayBlazor.initAll", _root); // hydrate enhancers over Blazor-rendered markup
        _self = DotNetObjectReference.Create(this);
        _tokens.Add(await JS.InvokeAsync<int>("FreedayBlazor.on", _root, "fdy-cascade-change", _self, nameof(OnCascade)));
        _tokens.Add(await JS.InvokeAsync<int>("FreedayBlazor.on", _root, "fdy-datepicker-change", _self, nameof(OnDate)));
        _tokens.Add(await JS.InvokeAsync<int>("FreedayBlazor.on", _root, "fdy-change", _self, nameof(OnStatus)));
        _tokens.Add(await JS.InvokeAsync<int>("FreedayBlazor.on", _root, "fdy-mask", _self, nameof(OnPo)));
        _tokens.Add(await JS.InvokeAsync<int>("FreedayBlazor.on", _root, "fdy-form-valid", _self, nameof(OnValid)));
    }

    [JSInvokable] public void OnCascade(CascadeDetail d) { _kategori = d.Value; _kategoriPath = d.Path; StateHasChanged(); }
    [JSInvokable] public void OnDate(ValueDetail d) { _jatuhTempo = d.Value; StateHasChanged(); }
    [JSInvokable] public void OnStatus(ValueDetail d) { _status = d.Value; StateHasChanged(); }
    [JSInvokable] public void OnPo(MaskDetail d) { _po = d.Value; StateHasChanged(); }

    [JSInvokable]
    public async Task OnValid(object? detail)
    {
        _submitted = new FakturData(_pelanggan, _email, _po, _kategori, _kategoriPath, _jatuhTempo, _status);
        StateHasChanged();
        await JS.InvokeVoidAsync("FreedayBlazor.toast", new
        {
            variant = "success",
            title = "Faktur tersimpan",
            message = $"{_pelanggan} · {Rupiah(Total)}",
        });
    }

    private async Task ToggleThemeAsync() => await JS.InvokeVoidAsync("FreedayBlazor.toggleTheme");

    public async ValueTask DisposeAsync()
    {
        foreach (var t in _tokens)
        {
            try { await JS.InvokeVoidAsync("FreedayBlazor.off", t); } catch (JSDisconnectedException) { }
        }
        _self?.Dispose();
    }

    // Event detail DTOs (Blazor deserialises the JS detail case-insensitively).
    public sealed record CascadeDetail(string Value, string Path, string[] Labels);
    public sealed record ValueDetail(string Value);
    public sealed record MaskDetail(string Value, string Raw);
    public sealed record FakturData(string Pelanggan, string Email, string Po, string Kategori, string KategoriPath, string JatuhTempo, string Status);
}
