using Freeday.Blazor;
using Microsoft.AspNetCore.Components;

namespace FreedayBlazorFaktur.Pages;

public partial class ComponentsDemo : ComponentBase
{
    private string _status = "draft";
    private string? _tanggal;
    private string? _kota;
    private string? _kategori;
    private string? _dari;
    private string? _sampai;
    private bool _modalOpen;

    private static readonly IReadOnlyList<string> _kotaOptions = new[]
    {
        "Jakarta", "Bandung", "Surabaya", "Medan", "Semarang", "Makassar",
    };

    private static readonly IReadOnlyList<FdyCascadeNode> _kategoriNodes = new[]
    {
        new FdyCascadeNode("jasa", "Jasa", new[]
        {
            new FdyCascadeNode("jasa-implementasi", "Implementasi"),
            new FdyCascadeNode("jasa-pelatihan", "Pelatihan"),
        }),
        new FdyCascadeNode("lisensi", "Lisensi", new[]
        {
            new FdyCascadeNode("lisensi-tahunan", "Tahunan"),
            new FdyCascadeNode("lisensi-perpetual", "Perpetual"),
        }),
    };

    private static readonly IReadOnlyList<FdyComboOption<string>> _statusOptions = new[]
    {
        new FdyComboOption<string>("draft", "Draft"),
        new FdyComboOption<string>("tertunda", "Tertunda"),
        new FdyComboOption<string>("lunas", "Lunas"),
    };

    private void OpenModal() => _modalOpen = true;
    private void CloseModal() => _modalOpen = false;
}
