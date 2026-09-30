import { ProviderDriverKind, ProviderInstanceId } from "@t3tools/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Combobox } from "../ui/combobox";
import { ModelListRow } from "./ModelListRow";

function renderModelRow(subProvider: string) {
  return renderToStaticMarkup(
    <Combobox value="" onValueChange={() => {}}>
      <ModelListRow
        index={0}
        model={{ slug: "gpt-6-luna", name: "GPT-6 Luna", subProvider }}
        instanceId={ProviderInstanceId.make("gapcode")}
        driverKind={ProviderDriverKind.make("gapcode")}
        providerDisplayName="Gapcode"
        isFavorite={false}
        isSelected={false}
        showProvider
        onToggleFavorite={() => {}}
      />
    </Combobox>,
  );
}

describe("ModelListRow", () => {
  it("does not repeat the provider name as its own sub-provider", () => {
    const markup = renderModelRow("GapCode");

    expect(markup.match(/gapcode/giu)).toHaveLength(1);
  });

  it("keeps a distinct sub-provider in the secondary label", () => {
    const markup = renderModelRow("OpenRouter");

    expect(markup).toContain("Gapcode · OpenRouter");
  });
});
