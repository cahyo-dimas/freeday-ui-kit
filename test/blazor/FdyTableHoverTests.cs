using Bunit;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// <c>HoverActionable</c> reaches the table as the class the stylesheet reads (#064); without it the
/// table renders exactly as before, so no existing page changes.
/// </summary>
public class FdyTableHoverTests : BunitContext
{
    private sealed record Row(int Id);

    private static readonly IReadOnlyList<FdyTableColumn<Row>> Columns = new[]
    {
        new FdyTableColumn<Row> { Key = "id", Label = "Id", Value = r => r.Id },
    };

    public FdyTableHoverTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
    }

    [Fact]
    public void HoverActionable_adds_the_modifier()
    {
        var cut = Render<FdyTable<Row>>(p => p
            .Add(c => c.Columns, Columns)
            .Add(c => c.Rows, new[] { new Row(1) })
            .Add(c => c.RowKey, r => r.Id)
            .Add(c => c.HoverActionable, true));

        Assert.Contains("fdy-table--hover-actionable", cut.Find("table").ClassList);
    }

    [Fact]
    public void Without_it_the_table_is_unchanged()
    {
        var cut = Render<FdyTable<Row>>(p => p
            .Add(c => c.Columns, Columns)
            .Add(c => c.Rows, new[] { new Row(1) })
            .Add(c => c.RowKey, r => r.Id));

        Assert.DoesNotContain("fdy-table--hover-actionable", cut.Find("table").ClassList);
    }
}
