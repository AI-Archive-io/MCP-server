# GitHub Actions Quick Reference

## 🎯 What We've Set Up

Your project now has **full CI/CD automation** with GitHub Actions. Here's what happens automatically:

---

## 🔄 Automated Workflows

### 1. **Test Workflow** (`test.yml`)
**When it runs:**
- Every push to `main` or `develop` branches
- Every pull request to `main` or `develop`

**What it does:**
- Tests on Node.js 18.x and 20.x
- Installs dependencies
- Runs `npm test`
- Runs linter (if configured)

**How to see results:**
- Go to your PR or commit
- Look for green ✅ or red ❌ next to "Tests"
- Click for detailed logs

---

### 2. **Security Audit** (`security.yml`)
**When it runs:**
- Every push/PR to `main`
- **Automatically every Monday at 9 AM UTC**

**What it does:**
- Runs `npm audit` for vulnerabilities
- Checks for high-severity issues
- Reports security problems

**How to review:**
- Check "Actions" tab in GitHub
- Look for "Security Audit" workflows
- Review any failures immediately

---

### 3. **NPM Publishing** (`publish.yml`)
**When it runs:**
- When you create a GitHub Release

**What it does:**
- Runs full test suite
- Publishes package to npm
- Uses provenance for security

**Setup required:**
1. Go to GitHub Settings → Secrets
2. Add secret: `NPM_TOKEN`
3. Get token from https://www.npmjs.com/settings/YOUR_USERNAME/tokens

**How to use:**
```bash
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Push to GitHub
git push && git push --tags

# 3. Create release on GitHub
# Go to: Releases → Create new release
# Select the version tag
# Write release notes
# Click "Publish release"

# 4. GitHub Actions automatically publishes to npm! 🎉
```

---

### 4. **Dependabot** (`dependabot.yml`)
**When it runs:**
- Weekly on Mondays

**What it does:**
- Checks for dependency updates
- Creates PRs for security updates
- Groups minor/patch updates

**How to manage:**
- Review Dependabot PRs
- Approve and merge safe updates
- Test breaking changes locally

---

## 🚦 PR Workflow

When someone submits a PR:

1. **Tests run automatically** ✅
   - Node 18.x tests
   - Node 20.x tests
   
2. **Security audit runs** 🔒
   - Checks for vulnerabilities
   
3. **PR template auto-fills** 📝
   - Contributor fills checklist
   
4. **Maintainer reviews** 👀
   - Code quality
   - Tests pass
   - Documentation updated
   
5. **Merge when green** ✅
   - All checks passed
   - Approved by maintainer

---

## 🛠️ Configuring GitHub Actions

### Required Secrets

Go to: `Settings → Secrets and variables → Actions`

Add these secrets:

1. **NPM_TOKEN** (required for publishing)
   - Get from: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Type: "Automation" token
   - Permissions: "Read and Publish"

### Optional: Slack Notifications

Add to workflows to get notified:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 📊 Monitoring CI/CD

### Check Workflow Status

**View all workflows:**
```
https://github.com/AI-Archive-io/MCP-server/actions
```

**Check specific workflow:**
1. Go to "Actions" tab
2. Click workflow name (Tests, Security, etc.)
3. See history of runs

**Debug failed workflow:**
1. Click failed run
2. Click failed job
3. Expand failed step
4. Read error logs

---

## 🔧 Troubleshooting

### Tests Failing on CI but Pass Locally

**Common causes:**
- Environment differences
- Missing dependencies
- Timezone issues
- File system differences

**Fix:**
```bash
# Run tests exactly like CI does
npm ci  # Clean install
npm test

# Check Node version matches
node --version  # Should be 18 or 20
```

### NPM Publish Failing

**Check:**
1. NPM_TOKEN secret is set
2. Token has publish permissions
3. Package version was bumped
4. Version doesn't already exist on npm

### Security Audit Failing

**Review:**
```bash
# Check vulnerabilities locally
npm audit

# Fix automatically if possible
npm audit fix

# For breaking changes
npm audit fix --force
```

---

## 🎯 Best Practices

### For Maintainers:

1. **Always review Dependabot PRs**
   - Don't auto-merge major updates
   - Test security patches

2. **Keep workflows updated**
   - Update action versions quarterly
   - Monitor for deprecations

3. **Monitor security alerts**
   - Check email notifications
   - Review weekly audit reports

4. **Use branch protection**
   - Require CI to pass
   - Require code review
   - Protect `main` branch

### For Contributors:

1. **Ensure tests pass locally**
   ```bash
   npm test
   ```

2. **Check for security issues**
   ```bash
   npm audit
   ```

3. **Follow PR template**
   - Fill all sections
   - Check all applicable items

4. **Wait for CI**
   - Don't ask for review until CI is green
   - Fix any failures quickly

---

## 📚 Additional Resources

- **GitHub Actions Docs**: https://docs.github.com/actions
- **npm Publishing**: https://docs.npmjs.com/creating-and-publishing-scoped-public-packages
- **Dependabot**: https://docs.github.com/code-security/dependabot
- **Branch Protection**: https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches

---

## 🚀 Quick Commands

```bash
# Run tests locally
npm test

# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Create a new release
npm version patch
git push && git push --tags
# Then create GitHub Release → Auto-publishes to npm!

# Check CI status
gh run list  # Requires GitHub CLI
```

---

**Pro Tip**: Set up branch protection rules to require CI to pass before merging! This ensures code quality and prevents broken builds.
