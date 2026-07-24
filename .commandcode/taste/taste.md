# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# communication style
- Typing is terse and casual with typos (e.g. "deplot" for "deploy"). Expects the agent to interpret abbreviated instructions and execute multi-step workflows without excessive back-and-forth clarification. Confidence: 0.8

# deployment workflow
- Uses git push → Docker on Ubuntu server for production deployments. Local dev is on Windows (F:\apps\renovessa). Confidence: 0.8
- Prefers the agent to handle commit, push, and deploy as a single bundled request. Confidence: 0.7

# email
- Use ops@renovessa.com (not ray@renovessa.com) as the SendGrid from/reply-to sender email. Confidence: 0.65

