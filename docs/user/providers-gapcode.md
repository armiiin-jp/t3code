# GapCode

Install and sign in to the GapCode CLI on the machine running your T3 Code server. In **Settings > Providers**, choose **Add provider**, select **GapCode**, and add an instance. Set **Binary path** if the server cannot find `gapcode` on its `PATH`.

Choose a GapCode model in a thread's model picker to start working. T3 Code shows its reasoning, tool activity, model options, and token use in the thread. **Usage > Limits** shows the account's reported session and weekly windows. **Usage** also reads GapCode's saved session history from its home directory.

Run `gapcode login` in the server machine's terminal if the provider reports that it is not authenticated. Update the CLI with `gapcode update`. In an existing GapCode thread, `/feedback` uploads the thread and logs to GapCode.
