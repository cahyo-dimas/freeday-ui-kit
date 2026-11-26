using Bunit;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// A parent that keeps <c>Process</c> output in its own state, which is what the parameter is for (a
/// card list beside the table). Every parent render re-sets the table's parameters, and the table used
/// to recompute and report again each time, so the two rendered each other without end.
/// </summary>
public class FdyTableProcessTests : BunitContext
{
    public FdyTableProcessTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
    }

    public sealed record Row(string Code);

    /// <summary>The parent: stores each report and re-renders, the documented use. It stops feeding the
    /// loop after 50 reports so a regression fails the assertion instead of hanging the suite.</summary>
    private sealed class Host : ComponentBase
    {
        public static int Reports;
        private IReadOnlyList<Row> _cards = Array.Empty<Row>();
        private static readonly IReadOnlyList<Row> Rows = new List<Row> { new("A"), new("B"), new("C") };

        protected override void BuildRenderTree(RenderTreeBuilder builder)
        {
            builder.OpenComponent<FdyTable<Row>>(0);
            builder.AddAttribute(1, nameof(FdyTable<Row>.Rows), Rows);
            builder.AddAttribute(2, nameof(FdyTable<Row>.Columns), new List<FdyTableColumn<Row>>
            {
                new() { Key = nameof(Row.Code), Label = "Code", Value = r => r.Code },
            });
            builder.AddAttribute(3, nameof(FdyTable<Row>.RowKey), (Func<Row, object>)(r => r.Code));
            builder.AddAttribute(4, nameof(FdyTable<Row>.Page), new FdyPageState(0, 10, 3));
            builder.AddAttribute(5, nameof(FdyTable<Row>.Process),
                EventCallback.Factory.Create<FdyTableProcess<Row>>(this, (FdyTableProcess<Row> r) =>
                {
                    Reports += 1;
                    if (Reports <= 50) _cards = r.Rows;
                }));
            builder.CloseComponent();
            builder.AddMarkupContent(6, $"<p id=\"cards\">{_cards.Count}</p>");
        }
    }

    [Fact]
    public void A_parent_that_stores_the_report_gets_it_once()
    {
        Host.Reports = 0;
        var cut = Render<Host>();
        cut.WaitForAssertion(() => Assert.Equal("3", cut.Find("#cards").TextContent));
        Thread.Sleep(200);

        Assert.True(Host.Reports <= 2, $"one report per change, got {Host.Reports}");
    }
}
