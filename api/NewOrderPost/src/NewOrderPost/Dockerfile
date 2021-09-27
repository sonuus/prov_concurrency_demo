FROM amazon/aws-lambda-dotnet AS base

FROM mcr.microsoft.com/dotnet/sdk:5.0-buster-slim as build

WORKDIR /source

COPY *.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /var/task
COPY --from=build /app/publish .
CMD ["LegacyOrderPost::LegacyOrderPost.Function::FunctionHandler"]
