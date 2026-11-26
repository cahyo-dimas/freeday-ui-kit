using Bunit;
using Xunit;

namespace Freeday.Blazor.Tests;

/// <summary>
/// The Blazor choose-from-list under responses that arrive late, out of order, or after the dialog
/// closed. <c>LoadPage</c> here returns a task the test completes, so each case decides the order
/// itself. Rows are named "query|page|n", so the list alone says which request produced it.
/// </summary>
public class FdyCflAsyncTests : BunitContext
{
    public FdyCflAsyncTests()
    {
        JSInterop.Mode = JSRuntimeMode.Loose;
    }

    private sealed record Item(string Name);

    private static readonly IReadOnlyList<CflColumn<Item>> Columns =
        new List<CflColumn<Item>> { new("Name", i => i.Name) };

    private sealed record Call(string Query, int Page, TaskCompletionSource<CflPage<Item>> Source)
    {
        public void Answer() => Source.SetResult(new CflPage<Item>(
            Enumerable.Range(0, 3).Select(n => new Item($"{(Query == "" ? "all" : Query)}|{Page}|{n}")).ToList(),
            HasMore: true));

        public void Fail() => Source.SetException(new InvalidOperationException("offline"));
    }

    private readonly List<Call> _calls = new();

    private Task<CflPage<Item>> Load(string query, int page)
    {
        var source = new TaskCompletionSource<CflPage<Item>>(TaskCreationOptions.RunContinuationsAsynchronously);
        _calls.Add(new Call(query, page, source));
        return source.Task;
    }

    private IRenderedComponent<FdyCfl<Item>> Render(int debounceMs) => Render<FdyCfl<Item>>(p => p
        .Add(c => c.LoadPage, Load)
        .Add(c => c.Columns, Columns)
        .Add(c => c.Display, i => i.Name)
        .Add(c => c.RowKey, i => i.Name)
        .Add(c => c.SearchDebounceMs, debounceMs));

    private static string[] Rows(IRenderedComponent<FdyCfl<Item>> cut)
        => cut.FindAll(".fdy-cfl__row").Select(r => r.TextContent.Trim()).ToArray();

    /* Opening awaits the first page, and the test is what answers it, so the open is started and not
       awaited; the test waits for the REQUEST instead. Awaiting it deadlocked the suite. */
    private static void Start(IRenderedComponent<FdyCfl<Item>> cut, Func<FdyCfl<Item>, Task> act)
        => _ = cut.InvokeAsync(() => act(cut.Instance));

    private Task<IRenderedComponent<FdyCfl<Item>>> OpenWithFirstPage(int debounceMs)
    {
        var cut = Render(debounceMs);
        Start(cut, c => c.OpenAsync());
        cut.WaitForAssertion(() => Assert.Single(_calls));
        _calls[0].Answer();
        cut.WaitForAssertion(() => Assert.Equal(3, Rows(cut).Length));
        return Task.FromResult(cut);
    }

    [Fact]
    public async Task Load_more_during_a_pending_search_asks_for_the_shown_query()
    {
        var cut = await OpenWithFirstPage(debounceMs: 5000);
        cut.Find("input[type=search]").Input("ab");
        cut.Find(".fdy-cfl__results .fdy-btn--ghost").Click();

        Assert.Equal(("", 1), (_calls[1].Query, _calls[1].Page));
    }

    [Fact]
    public async Task Reopening_shows_none_of_the_last_search_while_the_new_one_loads()
    {
        var cut = await OpenWithFirstPage(debounceMs: 0);
        cut.Find("input[type=search]").Input("xyz");
        cut.WaitForAssertion(() => Assert.Equal(2, _calls.Count));
        _calls[1].Answer();
        cut.WaitForAssertion(() => Assert.All(Rows(cut), r => Assert.StartsWith("xyz|", r)));

        await cut.InvokeAsync(() => cut.Instance.CloseAsync());
        Start(cut, c => c.OpenAsync());

        cut.WaitForAssertion(() => Assert.Equal(3, _calls.Count));
        Assert.Empty(Rows(cut));
    }

    [Fact]
    public async Task A_search_typed_just_before_closing_is_never_sent()
    {
        var cut = await OpenWithFirstPage(debounceMs: 50);
        cut.Find("input[type=search]").Input("ab");
        await cut.InvokeAsync(() => cut.Instance.CloseAsync());
        await Task.Delay(200);

        Assert.DoesNotContain(_calls, c => c.Query == "ab");
    }

    [Fact]
    public async Task A_failed_new_search_leaves_no_rows_from_the_old_query()
    {
        var cut = await OpenWithFirstPage(debounceMs: 0);
        cut.Find("input[type=search]").Input("x");
        cut.WaitForAssertion(() => Assert.Equal(2, _calls.Count));
        _calls[1].Fail();

        cut.WaitForAssertion(() => Assert.NotNull(cut.Find(".fdy-cfl__results [role=alert]")));
        Assert.Empty(Rows(cut));
    }

    [Fact]
    public async Task Try_again_repeats_the_page_that_failed()
    {
        var cut = await OpenWithFirstPage(debounceMs: 0);
        cut.Find(".fdy-cfl__results .fdy-btn--ghost").Click();
        _calls[1].Fail();
        cut.WaitForAssertion(() => Assert.NotNull(cut.Find(".fdy-cfl__results [role=alert] .fdy-btn")));

        cut.Find(".fdy-cfl__results [role=alert] .fdy-btn").Click();

        Assert.Equal(("", 1), (_calls[2].Query, _calls[2].Page));
        _calls[2].Answer();
        cut.WaitForAssertion(() => Assert.Equal(6, Rows(cut).Length));
    }
}
