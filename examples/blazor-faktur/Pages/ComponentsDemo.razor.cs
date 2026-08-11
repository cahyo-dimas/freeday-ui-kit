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
    private Customer? _customer;
    private bool _modalOpen;

    public sealed record Customer(string Id, string Name, string City);

    private static readonly IReadOnlyList<Customer> _allCustomers = new[]
    {
        new Customer("C001", "PT Sumber Makmur", "Jakarta"),
        new Customer("C002", "CV Bandung Jaya", "Bandung"),
        new Customer("C003", "PT Surya Abadi", "Surabaya"),
        new Customer("C004", "UD Medan Sentosa", "Medan"),
        new Customer("C005", "PT Semarang Mandiri", "Semarang"),
        new Customer("C006", "CV Makassar Raya", "Makassar"),
        new Customer("C007", "PT Nusantara Digital", "Jakarta"),
    };

    private static readonly IReadOnlyList<CflColumn<Customer>> _customerCols = new[]
    {
        new CflColumn<Customer>("Kode", c => c.Id),
        new CflColumn<Customer>("Nama", c => c.Name),
        new CflColumn<Customer>("Kota", c => c.City),
    };

    // Simulated async, server-paged, server-searched data source.
    private static async Task<CflPage<Customer>> LoadCustomers(string query, int page)
    {
        await Task.Delay(120);
        List<Customer> filtered = _allCustomers.Where(c =>
            string.IsNullOrEmpty(query)
            || c.Name.Contains(query, StringComparison.OrdinalIgnoreCase)
            || c.City.Contains(query, StringComparison.OrdinalIgnoreCase)
            || c.Id.Contains(query, StringComparison.OrdinalIgnoreCase)).ToList();
        const int size = 3;
        List<Customer> pageRows = filtered.Skip(page * size).Take(size).ToList();
        return new CflPage<Customer>(pageRows, filtered.Count > (page + 1) * size);
    }

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

    // --- Phase 3 demo data: table + chart + drawer ---------------------------
    private bool _drawerOpen;
    private Invoice? _activeInvoice;

    public sealed record Invoice(string Code, string Customer, string City, double Total, string Date);

    private static readonly IReadOnlyList<Invoice> _invoices = new[]
    {
        new Invoice("INV-001", "PT Sumber Makmur", "Jakarta", 4_500_000, "2026-07-02"),
        new Invoice("INV-002", "CV Bandung Jaya", "Bandung", 1_250_000, "2026-07-05"),
        new Invoice("INV-003", "PT Surya Abadi", "Surabaya", 8_900_000, "2026-07-09"),
        new Invoice("INV-004", "UD Medan Sentosa", "Medan", 3_100_000, "2026-07-12"),
        new Invoice("INV-005", "PT Semarang Mandiri", "Semarang", 6_400_000, "2026-07-18"),
        new Invoice("INV-006", "CV Makassar Raya", "Makassar", 2_050_000, "2026-07-21"),
        new Invoice("INV-007", "PT Nusantara Digital", "Jakarta", 9_750_000, "2026-07-27"),
    };

    private static readonly IReadOnlyList<FdyTableColumn<Invoice>> _invoiceCols = new[]
    {
        new FdyTableColumn<Invoice> { Key = "Code", Label = "Kode", Mono = true, Value = i => i.Code },
        new FdyTableColumn<Invoice> { Key = "Customer", Label = "Pelanggan", Sortable = true, Filter = FdyColumnFilterType.Text, Value = i => i.Customer },
        new FdyTableColumn<Invoice> { Key = "City", Label = "Kota", Sortable = true, Filter = FdyColumnFilterType.Enum, Value = i => i.City },
        new FdyTableColumn<Invoice> { Key = "Total", Label = "Total", Sortable = true, Filter = FdyColumnFilterType.Number, Align = FdyColumnAlign.Right, Mono = true, Value = i => i.Total },
        new FdyTableColumn<Invoice> { Key = "Date", Label = "Tanggal", Sortable = true, Filter = FdyColumnFilterType.Date, Value = i => i.Date },
    };

    private void OnInvoiceActivate(Invoice inv)
    {
        _activeInvoice = inv;
        _drawerOpen = true;
    }

    // Donut: revenue share by city (SVG chart repainted by FreedayChart.update).
    private static readonly IReadOnlyList<string> _cityLabels = new[] { "Jakarta", "Surabaya", "Semarang", "Lainnya" };
    private static readonly IReadOnlyList<double> _cityValues = new[] { 14.25, 8.9, 6.4, 6.4 };
}
