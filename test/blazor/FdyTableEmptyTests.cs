using Bunit;
using Microsoft.AspNetCore.Components;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// "No rows match these filters" and "nothing here yet" are different news (#069). The table owns
/// its column filters, so <c>EmptyTemplate</c> is told which it is and how to clear them.
/// </summary>
public class FdyTableEmptyTests : BunitContext
{
    private sealed record Row(int Id, string Name);

    private static readonly IReadOnlyList<FdyTableColumn<Row>> Columns = new[]
    {
        new FdyTableColumn<Row> { Key = "name", Label = "Name", Value = r => r.Name, Filter = FdyColumnFilterType.Text },
    };

    public FdyTableEmptyTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
    }

    private static RenderFragment<FdyTableEmptyContext> Template => ctx => builder =>
    {
        builder.OpenElement(0, "button");
        builder.AddAttribute(1, "id", ctx.Filtered ? "clear" : "nothing");
        builder.AddAttribute(2, "onclick", EventCallback.Factory.Create(new object(), ctx.ClearFilters));
        builder.CloseElement();
    };

    [Fact]
    public void A_filter_that_matches_nothing_is_reported_and_can_be_cleared()
    {
        IReadOnlyDictionary<string, FdyColumnFilter>? cleared = null;
        var cut = Render<FdyTable<Row>>(p => p
            .Add(c => c.Columns, Columns)
            .Add(c => c.Rows, new[] { new Row(1, "Alpha") })
            .Add(c => c.RowKey, r => r.Id)
            .Add(c => c.Filters, new Dictionary<string, FdyColumnFilter> { ["name"] = new FdyColumnFilter.Text("zzz") })
            .Add(c => c.FiltersChanged, (IReadOnlyDictionary<string, FdyColumnFilter> f) => cleared = f)
            .Add(c => c.EmptyTemplate, Template));

        cut.Find("#clear").Click();

        Assert.NotNull(cleared);
        Assert.Empty(cleared!);
    }

    [Fact]
    public void An_empty_table_with_no_filter_is_nothing_yet()
    {
        var cut = Render<FdyTable<Row>>(p => p
            .Add(c => c.Columns, Columns)
            .Add(c => c.Rows, Array.Empty<Row>())
            .Add(c => c.RowKey, r => r.Id)
            .Add(c => c.EmptyTemplate, Template));

        Assert.NotNull(cut.Find("#nothing"));
    }
}
