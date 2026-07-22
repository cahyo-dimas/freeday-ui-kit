using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using FreedayBlazorFaktur.Pages;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<Faktur>("#app");

await builder.Build().RunAsync();
