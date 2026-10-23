using Bunit;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// The footer's strings come from the app (butir 2). The raw path has read
/// <c>data-fdy-text-&lt;key&gt;</c> since 1.39.0 and this path read nothing, so a Blazor page in
/// any other language had to rewrite the whole band by hand. Both halves are asserted: the given
/// wording has to render, and a footer given nothing has to still read English, which is what
/// leaves every shipped page where it is.
/// </summary>
public class FdyTableFooterTextTests : BunitContext
{
    // Page index 2 of five-row pages over 25 rows: rows 11 to 15, page 3 of 5, so the window is
    // 1..5 and the second item in the list is page 1 as a button, carrying the numbered label.
    private static readonly FdyPageState Page = new(2, 5, 25);

    private static readonly int[] Sizes = [5, 10, 25];

    public FdyTableFooterTextTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
    }

    private static string Label(IRenderedComponent<FdyTableFooter> cut, int nth) =>
        cut.FindAll(".fdy-pagination__list > li")[nth].Children[0].GetAttribute("aria-label")!;

    private static string Last(IRenderedComponent<FdyTableFooter> cut)
    {
        var items = cut.FindAll(".fdy-pagination__list > li");
        return items[items.Count - 1].Children[0].GetAttribute("aria-label")!;
    }

    [Fact]
    public void The_given_wording_reaches_the_markup()
    {
        var cut = Render<FdyTableFooter>(p => p
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
    public void Without_the_parameters_it_is_still_English()
    {
        var cut = Render<FdyTableFooter>(p => p
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
