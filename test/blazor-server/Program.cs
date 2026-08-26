using Microsoft.Extensions.FileProviders;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
builder.Services.AddRazorComponents().AddInteractiveServerComponents();
builder.Logging.ClearProviders();

WebApplication app = builder.Build();

// Serve the kit straight out of dist/ rather than copying it in: a harness that tests a stale copy
// of the enhancer is a harness that tests nothing. Same for the Blazor bridge in adapters/.
//
// Located by SEARCHING upward for the built kit, not by counting "../.." from a content root:
// ContentRootPath follows the working directory, so `dotnet run` and `dotnet <dll>` resolve it
// differently and the second one walked clean out of the repository. Measured, not guessed — that
// is exactly how this first failed.
string root = AppContext.BaseDirectory;
while (!File.Exists(Path.Combine(root, "dist", "freeday.js")))
{
    DirectoryInfo? parent = Directory.GetParent(root);
    if (parent is null) throw new DirectoryNotFoundException(
        $"could not find the built kit (dist/freeday.js) above {AppContext.BaseDirectory} — run `node tokens/build.mjs` first");
    root = parent.FullName;
}
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(root, "dist")),
    RequestPath = "/kit",
});
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(root, "adapters", "blazor")),
    RequestPath = "/bridge",
});

app.UseAntiforgery();
app.MapRazorComponents<Freeday.Blazor.ServerHarness.Components.App>()
   .AddInteractiveServerRenderMode();

app.Run();
