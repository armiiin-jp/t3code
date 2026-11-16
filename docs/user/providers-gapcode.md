# GapCode

Install and sign in to the GapCode CLI on the machine running your T3 Code server. In **Settings > Providers**, choose **Add provider**, select **GapCode**, and add an instance. Set **Binary path** if the server cannot find `gapcode` on its `PATH`.

Choose a GapCode model in a thread's model picker to start working. T3 Code shows its reasoning, tool activity, model options, and token use in the thread. **Usage > Limits** shows the account's reported session and weekly windows. **Usage** also reads GapCode's saved session history from its home directory.

Use the sign-in action on a provider card when an instance needs authentication. Run `gapcode update` in the server machine's terminal to update the CLI. In an existing GapCode thread, `/feedback` uploads the thread and logs to GapCode.

For a separate account, add another GapCode instance and choose **Sign in with GapGPT** on its provider card. Each additional instance gets its own home and credentials. You can set **GAPCODE_HOME path** to choose a different directory. T3 Code resolves the installed launcher to its bundled executable so the launcher cannot redirect the instance to the default account.
