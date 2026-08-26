using Bunit;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// Row selection in the typed adapters (NEXT-UP #3). The Vue and React halves are driven with real
/// mouse events in <c>browser/adapter.mjs</c>; Blazor is a third, independent implementation of the
/// same contract, and <c>dotnet build</c> can see none of what follows: that the checkbox column is
/// rendered at all, that the full-width rows widen with it, that select-all reaches the visible page
/// and only the visible page, and that keys picked on a page the reader has left are kept rather
/// than quietly dropped.
///
/// The one behaviour deliberately NOT asserted here is <c>indeterminate</c>: it is a DOM property
/// pushed through <c>FreedayBlazor.setIndeterminate</c>, so bUnit's markup is the wrong instrument.
/// Its guard is the interop call itself, asserted below.
/// </summary>
public class FdyTableSelectionTests : BunitContext
{
    private sealed record Row(string Code, string Name);

    private static readonly IReadOnlyList<FdyTableColumn<Row>> Columns = new[]
    {
        new FdyTableColumn<Row> { Key = nameof(Row.Code), Label = "Code" },
        new FdyTableColumn<Row> { Key = nameof(Row.Name), Label = "Name" },
    };

    private static readonly IReadOnlyList<Row> Rows = Enumerable
        .Range(1, 4)
        .Select(i => new Row($"C-{i}", $"Row {i}"))
        .ToList();

    public FdyTableSelectionTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
    }

    private IRenderedComponent<FdyTable<Row>> RenderTable(
        IReadOnlyList<object>? selected,
        Action<IReadOnlyList<object>>? onChange,
        bool selectable = true,
        int pageSize = 2)
    {
        return Render<FdyTable<Row>>(p =>
        {
            p.Add(c => c.Columns, Columns)
             .Add(c => c.Rows, Rows)
             .Add(c => c.RowKey, r => r.Code)
             .Add(c => c.PageSize, pageSize)
             .Add(c => c.Selectable, selectable);
            if (selected is not null) p.Add(c => c.SelectedKeys, selected);
            if (onChange is not null) p.Add(c => c.SelectedKeysChanged, onChange);
        });
    }

    [Fact]
    public void Selectable_renders_the_column_and_widens_the_full_width_rows()
    {
        var cut = RenderTable(Array.Empty<object>(), _ => { });

        Assert.NotNull(cut.Find("th.fdy-table__selcol [data-fdy-select-all]"));
        Assert.Equal(2, cut.FindAll("tbody tr td.fdy-table__selcol [data-fdy-row-select]").Count);

        // The bulk bar exists from the start but stays out of the way until something is picked.
        var bar = cut.Find(".fdy-table-bulkbar");
        Assert.True(bar.HasAttribute("hidden"));
        Assert.Equal("0 selected", cut.Find(".fdy-table-bulkbar__count").TextContent.Trim());
    }

    [Fact]
    public void Not_selectable_adds_nothing_at_all()
    {
        var cut = RenderTable(null, null, selectable: false);

        Assert.Empty(cut.FindAll(".fdy-table__selcol"));
        Assert.Empty(cut.FindAll(".fdy-table-bulkbar"));
        // The empty/loading/detail rows must not have been widened for a column that is not there.
        Assert.Empty(cut.FindAll("[data-fdy-select-all]"));
    }

    [Fact]
    public void Ticking_a_row_reports_its_row_key()
    {
        IReadOnlyList<object> got = Array.Empty<object>();
        var cut = RenderTable(Array.Empty<object>(), keys => got = keys);

        cut.FindAll("tbody tr td.fdy-table__selcol input")[0].Change(true);

        Assert.Equal(new object[] { "C-1" }, got);
    }

    [Fact]
    public void Select_all_covers_the_visible_page_and_not_the_rows_behind_it()
    {
        IReadOnlyList<object> got = Array.Empty<object>();
        var cut = RenderTable(Array.Empty<object>(), keys => got = keys);

        cut.Find("[data-fdy-select-all]").Change(true);

        // Four rows exist; two are on screen. A header box that reached C-3 and C-4 would be
        // selecting rows the reader cannot see, which is how a bulk delete goes wrong.
        Assert.Equal(new object[] { "C-1", "C-2" }, got);
    }

    [Fact]
    public void A_pick_on_another_page_keeps_the_keys_already_held()
    {
        IReadOnlyList<object> got = Array.Empty<object>();
        // Page 1 is fully selected; the reader has moved to page 2 (PageIndex 1) and ticks a row.
        var cut = Render<FdyTable<Row>>(p => p
            .Add(c => c.Columns, Columns)
            .Add(c => c.Rows, Rows)
            .Add(c => c.RowKey, r => r.Code)
            .Add(c => c.PageSize, 2)
            .Add(c => c.PageIndex, 1)
            .Add(c => c.Selectable, true)
            .Add(c => c.SelectedKeys, new object[] { "C-1", "C-2" })
            .Add<IReadOnlyList<object>>(c => c.SelectedKeysChanged, keys => got = keys));

        Assert.False(cut.Find("[data-fdy-select-all]").HasAttribute("checked"),
            "a fresh page starts unticked even though the other page is fully selected");

        cut.FindAll("tbody tr td.fdy-table__selcol input")[0].Change(true);

        Assert.Equal(new object[] { "C-1", "C-2", "C-3" }, got);
    }

    [Fact]
    public void Clearing_empties_the_whole_selection_not_just_the_page_in_view()
    {
        IReadOnlyList<object> got = new object[] { "seeded" };
        var cut = RenderTable(new object[] { "C-1", "C-2", "C-3" }, keys => got = keys);

        Assert.Equal("3 selected", cut.Find(".fdy-table-bulkbar__count").TextContent.Trim());
        cut.Find(".fdy-table-bulkbar__actions button").Click();

        Assert.Empty(got);
    }

    [Fact]
    public void The_mixed_state_is_pushed_through_interop_because_markup_cannot_carry_it()
    {
        // `indeterminate` has no HTML attribute, so a Blazor page that only rendered would show a
        // half-selected page as plainly unchecked. One row of two ticked must reach the bridge.
        RenderTable(new object[] { "C-1" }, _ => { });

        Assert.NotEmpty(JSInterop.Invocations["FreedayBlazor.setIndeterminate"]);
    }
}
