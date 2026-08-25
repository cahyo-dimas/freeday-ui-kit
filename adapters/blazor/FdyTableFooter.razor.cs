using Microsoft.AspNetCore.Components;

namespace Freeday.Blazor;

/// <summary>
/// The table footer, range, optional rows-per-page, pager, as a component of its own.
/// It owns nothing: <see cref="Page"/> in, <see cref="PageChanged"/> out, the same contract as
/// <c>FdyTable</c>'s server mode.
/// </summary>
public partial class FdyTableFooter
{
    /// <summary>The page being shown. <c>Size</c> drives the range AND the rows-per-page value.</summary>
    [Parameter, EditorRequired] public FdyPageState Page { get; set; } = new(0, 0, 0);

    [Parameter] public EventCallback<FdyPageState> PageChanged { get; set; }

    /// <summary>
    /// Offer a rows-per-page control. Leave null for none; the footer is then range + pager,
    /// exactly as before. Picking a size raises <see cref="PageChanged"/> with the new size and the
    /// index that still holds the row the reader was looking at.
    /// </summary>
    [Parameter] public IReadOnlyList<int>? PageSizes { get; set; }

    private IReadOnlyList<int> Sizes => PageSizes ?? Array.Empty<int>();

    // Just the number: the control sits beside a label reading "Rows", so "20 per page" states the
    // same fact twice and truncates doing it.
    private IReadOnlyList<FdyComboOption<string>> SizeOptions =>
        Sizes.Select(size => new FdyComboOption<string>(size.ToString(), size.ToString())).ToList();

    // The combo is labelled by the visible word beside it, a <label for> cannot reach inside a
    // component, and an aria-label would leave that word attached to nothing.
    private readonly string SizeLabelId = $"fdy-rows-{Guid.NewGuid():N}";

    private int TotalPages => Page.Size > 0 ? Math.Max(1, (int)Math.Ceiling((double)Page.Total / Page.Size)) : 1;
    private int CurrentPage1 => Page.Index + 1;
    private int RangeFrom => Page.Total == 0 ? 0 : Page.Index * Page.Size + 1;
    private int RangeTo => Math.Min(Page.Total, (Page.Index + 1) * Page.Size);
    private List<int?> Pages => TableModel.PageWindow(CurrentPage1, TotalPages);

    private bool HasPager => Page.Size > 0 && TotalPages > 1;

    // One page and no size control means there is nothing here to say, the table has always
    // withheld the whole band in that case, and this is where that decision now lives.
    private bool Visible => HasPager || Sizes.Count > 0;

    private async Task GoTo(int page1)
    {
        int clamped = Math.Min(Math.Max(1, page1), TotalPages);
        await PageChanged.InvokeAsync(new FdyPageState(clamped - 1, Page.Size, Page.Total));
    }

    private async Task OnSize(string value)
    {
        if (!int.TryParse(value, out int size) || size <= 0 || size == Page.Size) return;
        await PageChanged.InvokeAsync(
            new FdyPageState(TableModel.PageIndexForSize(Page.Index, Page.Size, size), size, Page.Total));
    }
}
