using Bunit;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// The six footer strings asked of <c>FdyTable</c> rather than of <c>FdyTableFooter</c> (butir 1 of
/// 3.9.0). 3.8.0 gave the footer those parameters and left all three tables drawing their own footer
/// without forwarding any of them, so the hatch existed everywhere except on the component almost
/// every page actually uses. What <c>dotnet build</c> cannot see: a parameter declared on the table
/// and forwarded nowhere compiles perfectly. Both halves are asserted, as with the footer's own
/// tests: the given wording has to render, and a table given nothing has to still read English,
/// which is what leaves every shipped page where it is.
/// </summary>
public class FdyTableFooterForwardTests : BunitContext
{
    private sealed record Row(int Id, string Name);

    private static readonly IReadOnlyList<FdyTableColumn<Row>> Columns = new[]
    {
        new FdyTableColumn<Row> { Key = nameof(Row.Id), Label = "ID" },
        new FdyTableColumn<Row> { Key = nameof(Row.Name), Label = "Name" },
    };

    // Rows 11 to 15 of 25, five to a page: page 3 of 5, so the window is 1..5 and the second item
    // in the pager list is page 1 as a button, carrying the numbered label.
    private static readonly IReadOnlyList<Row> Rows = Enumerable
        .Range(11, 5)
        .Select(i => new Row(i, $"Row {i}"))
        .ToList();

    private static readonly FdyPageState Page = new(2, 5, 25);

    private static readonly int[] Sizes = [5, 10, 25];

    public FdyTableFooterForwardTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
    }

    private static string Label(IRenderedComponent<FdyTable<Row>> cut, int nth) =>
        cut.FindAll(".fdy-pagination__list > li")[nth].Children[0].GetAttribute("aria-label")!;

    private static string Last(IRenderedComponent<FdyTable<Row>> cut)
    {
        var items = cut.FindAll(".fdy-pagination__list > li");
        return items[items.Count - 1].Children[0].GetAttribute("aria-label")!;
    }

    [Fact]
    public void The_wording_given_to_the_table_reaches_its_own_footer()
    {
        var cut = Render<FdyTable<Row>>(p => p
            .Add(c => c.Columns, Columns)
            .Add(c => c.Rows, Rows)
            .Add(c => c.RowKey, r => (object)r.Id)
            .Add(c => c.Page, Page)
            .Add(c => c.PageSizes, Sizes)
            // {total} twice on purpose: every occurrence is replaced, as the enhancer's textOf does.
            .Add(c => c.InfoText, "Menampilkan {from}-{to} dari {total} ({total})")
            .Add(c => c.PageSizeLabel, "Baris")
            .Add(c => c.PaginationLabel, "Paginasi")
            .Add(c => c.PrevLabel, "Halaman sebelumnya")
            .Add(c => c.NextLabel, "Halaman berikutnya")
            .Add(c => c.PageLabel, "Ke halaman {n}"));

        Assert.Equal("Menampilkan 11-15 dari 25 (25)", cut.Find(".fdy-table-footer__info").TextContent);
        Assert.Equal("Baris", cut.Find(".fdy-table-footer__size > span").TextContent);
        Assert.Equal("Paginasi", cut.Find(".fdy-pagination").GetAttribute("aria-label"));
        Assert.Equal("Halaman sebelumnya", Label(cut, 0));
        Assert.Equal("Ke halaman 1", Label(cut, 1));
        Assert.Equal("Halaman berikutnya", Last(cut));
    }

    [Fact]
    public void A_table_given_no_wording_still_reads_English()
    {
        var cut = Render<FdyTable<Row>>(p => p
            .Add(c => c.Columns, Columns)
            .Add(c => c.Rows, Rows)
            .Add(c => c.RowKey, r => (object)r.Id)
            .Add(c => c.Page, Page)
            .Add(c => c.PageSizes, Sizes));

        Assert.Equal("Showing 11–15 of 25", cut.Find(".fdy-table-footer__info").TextContent);
        Assert.Equal("Rows", cut.Find(".fdy-table-footer__size > span").TextContent);
        Assert.Equal("Pagination", cut.Find(".fdy-pagination").GetAttribute("aria-label"));
        Assert.Equal("Previous page", Label(cut, 0));
        Assert.Equal("Go to page 1", Label(cut, 1));
        Assert.Equal("Next page", Last(cut));
    }
}
