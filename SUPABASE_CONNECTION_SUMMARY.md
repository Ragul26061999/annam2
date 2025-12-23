# Supabase Connection Summary

## MCP Server Configuration
The Supabase MCP server has been configured in `.vscode/settings.json` with the following settings:

```json
{
  "mcpServers": {
    "annam": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=zusheijhebsmjiyyeiqq"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_ac6025de8a67188dfe39decb9d357387eab6ba6f"
      }
    }
  }
}
```

## Service Endpoints
After resolving port conflicts, the Supabase services are now running on the following endpoints:

| Service | URL |
|---------|-----|
| Studio | http://127.0.0.1:54331 |
| Mailpit | http://127.0.0.1:54332 |
| MCP | http://127.0.0.1:54333/mcp |
| Project URL | http://127.0.0.1:54333 |
| REST API | http://127.0.0.1:54333/rest/v1 |
| GraphQL | http://127.0.0.1:54333/graphql/v1 |
| Edge Functions | http://127.0.0.1:54333/functions/v1 |

## Database Connection
| Parameter | Value |
|----------|-------|
| URL | postgresql://postgres:postgres@127.0.0.1:54325/postgres |

## Updated Port Configuration
To resolve port conflicts, the following ports were updated in `supabase/config.toml`:

- API Port: 54333 (originally 54321)
- Database Port: 54325 (originally 54322)
- Shadow Database Port: 54326 (originally 54320)
- Studio Port: 54331 (originally 54323)
- Inbucket Port: 54332 (originally 54324)
- Analytics Port: 54330 (originally 54327)

## Authentication Keys
- Publishable Key: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
- Secret Key: sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

## Verification Commands
To verify the connection status, you can use the following commands:

```bash
# Check service status
supabase status

# Test database connection
supabase db diff --use-migra

# Stop services
supabase stop

# Start services
supabase start
```

The Supabase CLI is currently at version 2.65.5, with version 2.67.1 available for update.