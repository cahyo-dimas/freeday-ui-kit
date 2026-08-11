using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Freeday.Blazor;

public partial class FdyDrawer
{
    /// <summary>Whether the drawer is open. Two-way bindable via <c>@bind-Open</c>.</summary>
    [Parameter] public bool Open { get; set; }
    [Parameter] public EventCallback<bool> OpenChanged { get; set; }

    /// <summary>Plain-text title; ignored when <see cref="TitleContent"/> is supplied.</summary>
    [Parameter] public string Title { get; set; } = string.Empty;
    [Parameter] public RenderFragment? TitleContent { get; set; }

    /// <summary>The drawer body.</summary>
    [Parameter] public RenderFragment? ChildContent { get; set; }

    /// <summary>Optional footer (action buttons). Omitted entirely when null.</summary>
    [Parameter] public RenderFragment? FooterContent { get; set; }

    /// <summary>Which edge the panel anchors to: <c>left</c> (default) or <c>right</c>.</summary>
    [Parameter] public string Side { get; set; } = "left";

    /// <summary>When true (default), Esc and a backdrop click dismiss the drawer and a close
    /// button is shown. Set false for a panel the user must resolve via an explicit action.</summary>
    [Parameter] public bool Dismissible { get; set; } = true;

    [Parameter] public string CloseLabel { get; set; } = "Close";

    /// <summary>Raised after any dismissal (close button, Esc, or backdrop).</summary>
    [Parameter] public EventCallback OnClose { get; set; }

    private readonly string _titleId = $"fdy-drawer-{Guid.NewGuid():N}-title";
    private int _dialogToken;
    private bool _lastOpen;

    private string DrawerClass => Side == "right" ? "fdy-drawer fdy-drawer--right" : "fdy-drawer";

    protected override async ValueTask HydrateAsync()
    {
        _dialogToken = await JS.InvokeAsync<int>(
            "FreedayBlazor.dialogInit", Root, Self, nameof(OnDismiss), Dismissible);
        await SyncAsync();
    }

    protected override async Task OnParametersSetAsync()
    {
        // Only reconcile once the dialog is wired (token != 0) and the open state actually changed.
        if (_dialogToken != 0 && Open != _lastOpen)
        {
            await SyncAsync();
        }
    }

    private async ValueTask SyncAsync()
    {
        _lastOpen = Open;
        await JS.InvokeVoidAsync(Open ? "FreedayBlazor.dialogShow" : "FreedayBlazor.dialogClose", Root);
    }

    /// <summary>Invoked by the bridge when the user dismisses via Esc or a backdrop click.</summary>
    [JSInvokable]
    public Task OnDismiss() => DismissAsync();

    private async Task DismissAsync()
    {
        if (OpenChanged.HasDelegate)
        {
            await OpenChanged.InvokeAsync(false);
        }
        else
        {
            Open = false;
            _lastOpen = false;
            await JS.InvokeVoidAsync("FreedayBlazor.dialogClose", Root);
        }
        await OnClose.InvokeAsync();
    }

    protected override async ValueTask CleanupAsync()
    {
        if (_dialogToken != 0)
        {
            await JS.InvokeVoidAsync("FreedayBlazor.dialogDispose", _dialogToken);
        }
    }
}
