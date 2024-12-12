"use strict";
/**
 * @author ririxi
 */
const loadWebpack = () => {
    try {
        const require = window.webpackChunkclient_web.push([[Symbol()], {}, (re) => re]);
        const cache = Object.keys(require.m).map(id => require(id));
        const modules = cache
            .filter(module => typeof module === "object")
            .flatMap(module => {
            try {
                return Object.values(module);
            }
            catch { }
        });
        const functionModules = modules.filter(module => typeof module === "function");
        return { cache, functionModules };
    }
    catch (error) {
        console.error("adblockify: Failed to load webpack", error);
        return { cache: [], functionModules: [] };
    }
};
const getSettingsClient = (cache) => {
    try {
        return cache.find((m) => m.settingsClient).settingsClient;
    }
    catch (error) {
        console.error("adblockify: Failed to get ads settings client", error);
        return null;
    }
};
const getSlotsClient = (functionModules, transport) => {
    try {
        const slots = functionModules.find(m => m.SERVICE_ID === "spotify.ads.esperanto.slots.proto.Slots" || m.SERVICE_ID === "spotify.ads.esperanto.proto.Slots");
        return new slots(transport);
    }
    catch (error) {
        console.error("adblockify: Failed to get slots client", error);
        return null;
    }
};
const map = new Map();
const retryCounter = (slotId, action) => {
    if (!map.has(slotId))
        map.set(slotId, { count: 0 });
    if (action === "increment")
        map.get(slotId).count++;
    else if (action === "clear")
        map.delete(slotId);
    else if (action === "get")
        return map.get(slotId)?.count;
};
(async function adblockify() {
    // @ts-expect-error: Events are not defined in types
    await new Promise(res => Spicetify.Events.platformLoaded.on(res));
    // @ts-expect-error: Events are not defined in types
    await new Promise(res => Spicetify.Events.webpackLoaded.on(res));
    const webpackCache = loadWebpack();
    // @ts-expect-error: createInternalMap, RemoteConfigResolver is not defined in types
    const { Platform, createInternalMap, Locale, RemoteConfigResolver } = Spicetify;
    const { AdManagers } = Platform;
    if (!AdManagers?.audio || Object.keys(AdManagers).length === 0) {
        setTimeout(adblockify, 100);
        return;
    }
    const { audio } = AdManagers;
    const { UserAPI } = Platform;
    const productState = UserAPI._product_state || UserAPI._product_state_service || Platform?.ProductStateAPI?.productStateApi;
    if (!Spicetify?.CosmosAsync) {
        setTimeout(adblockify, 100);
        return;
    }
    const { CosmosAsync } = Spicetify;
    const slots = await CosmosAsync.get("sp://ads/v1/slots");
    const hideAdLikeElements = () => {
        const css = document.createElement("style");
        const upgradeText = Locale.get("upgrade.tooltip.title");
        css.className = "adblockify";
        css.innerHTML = `.nHCJskDZVlmDhNNS9Ixv, .utUDWsORU96S7boXm2Aq, .cpBP3znf6dhHLA2dywjy, .G7JYBeU1c2QawLyFs5VK, .vYl1kgf1_R18FCmHgdw2, .vZkc6VwrFz0EjVBuHGmx, .iVAZDcTm1XGjxwKlQisz, ._I_1HMbDnNlNAaViEnbp, .xXj7eFQ8SoDKYXy6L3E1, .F68SsPm8lZFktQ1lWsQz, .MnW5SczTcbdFHxLZ_Z8j, .WiPggcPDzbwGxoxwLWFf, .ReyA3uE3K7oEz7PTTnAn, .x8e0kqJPS0bM4dVK7ESH, .gZ2Nla3mdRREDCwybK6X, .SChMe0Tert7lmc5jqH01, .AwF4EfqLOIJ2xO7CjHoX, .UlkNeRDFoia4UDWtrOr4, .k_RKSQxa2u5_6KmcOoSw, ._mWmycP_WIvMNQdKoAFb, .O3UuqEx6ibrxyOJIdpdg, .akCwgJVf4B4ep6KYwrk5, .bIA4qeTh_LSwQJuVxDzl, .ajr9pah2nj_5cXrAofU_, .gvn0k6QI7Yl_A0u46hKn, .obTnuSx7ZKIIY1_fwJhe, .IiLMLyxs074DwmEH4x5b, .RJjM91y1EBycwhT_wH59, .mxn5B5ceO2ksvMlI1bYz, .l8wtkGVi89_AsA3nXDSR, .Th1XPPdXMnxNCDrYsnwb, .SJMBltbXfqUiByDAkUN_, .Nayn_JfAUsSO0EFapLuY, .YqlFpeC9yMVhGmd84Gdo, .HksuyUyj1n3aTnB4nHLd, .DT8FJnRKoRVWo77CPQbQ, ._Cq69xKZBtHaaeMZXIdk, .main-leaderboardComponent-container, .sponsor-container, a.link-subtle.main-navBar-navBarLink.GKnnhbExo0U9l7Jz2rdc, button[title="${upgradeText}"], button[aria-label="${upgradeText}"], .main-topBar-UpgradeButton, .main-contextMenu-menuItem a[href^="https://www.spotify.com/premium/"], div[data-testid*="hpto"] {display: none !important;}`;
        document.head.appendChild(css);
    };
    const disableAds = async () => {
        try {
            await productState.putOverridesValues({ pairs: { ads: "0", catalogue: "premium", product: "premium", type: "premium" } });
        }
        catch (error) {
            console.error("adblockify: Failed inside `disableAds` function\n", error);
        }
    };
    const configureAdManagers = async () => {
        try {
            const { billboard, leaderboard, sponsoredPlaylist } = AdManagers;
            await CosmosAsync.post("sp://ads/v1/testing/playtime", { value: -100000000000 });
            await audio.disable();
            audio.isNewAdsNpvEnabled = false;
            await billboard.disable();
            await leaderboard.disableLeaderboard();
            await sponsoredPlaylist.disable();
            if (AdManagers?.inStreamApi) {
                const { inStreamApi } = AdManagers;
                await inStreamApi.disable();
            }
            if (AdManagers?.vto) {
                const { vto } = AdManagers;
                await vto.manager.disable();
                vto.isNewAdsNpvEnabled = false;
            }
            setTimeout(disableAds, 100);
        }
        catch (error) {
            console.error("adblockify: Failed inside `configureAdManagers` function\n", error);
        }
    };
    const bindToSlots = async () => {
        for (const slot of slots) {
            subToSlot(slot.slot_id);
            setTimeout(() => handleAdSlot({ adSlotEvent: { slotId: slot.slot_id } }), 50);
        }
    };
    const handleAdSlot = (data) => {
        const slotId = data?.adSlotEvent?.slotId;
        try {
            const adsCoreConnector = audio?.inStreamApi?.adsCoreConnector;
            if (typeof adsCoreConnector?.clearSlot === "function")
                adsCoreConnector.clearSlot(slotId);
            const slotsClient = getSlotsClient(webpackCache.functionModules, productState.transport);
            if (slotsClient)
                slotsClient.clearAllAds({ slotId });
            updateSlotSettings(slotId);
        }
        catch (error) {
            console.error("adblockify: Failed inside `handleAdSlot` function. Retrying in 1 second...\n", error);
            retryCounter(slotId, "increment");
            if (retryCounter(slotId, "get") > 5) {
                console.error(`adblockify: Failed inside \`handleAdSlot\` function for 5th time. Giving up...\nSlot id: ${slotId}.`);
                retryCounter(slotId, "clear");
                return;
            }
            setTimeout(handleAdSlot, 1 * 1000, data);
        }
        configureAdManagers();
    };
    const updateSlotSettings = async (slotId) => {
        try {
            const settingsClient = getSettingsClient(webpackCache.cache);
            if (!settingsClient)
                return;
            await settingsClient.updateAdServerEndpoint({ slotIds: [slotId], url: "http://localhost/no/thanks" });
            await settingsClient.updateStreamTimeInterval({ slotId, timeInterval: "0" });
            await settingsClient.updateSlotEnabled({ slotId, enabled: false });
            await settingsClient.updateDisplayTimeInterval({ slotId, timeInterval: "0" });
        }
        catch (error) {
            console.error("adblockify: Failed inside `updateSlotSettings` function\n", error);
        }
    };
    const intervalUpdateSlotSettings = async () => {
        for (const slot of slots) {
            updateSlotSettings(slot.slot_id);
        }
    };
    const subToSlot = (slot) => {
        try {
            audio.inStreamApi.adsCoreConnector.subscribeToSlot(slot, handleAdSlot);
        }
        catch (error) {
            console.error("adblockify: Failed inside `subToSlot` function\n", error);
        }
    };
    const runObserver = () => {
        const nodeList = Array.from(document.querySelectorAll(".ReactModalPortal"));
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    const node = mutation.addedNodes[0];
                    const InAppModal = node.classList.contains("GenericModal__overlay");
                    if (!InAppModal)
                        continue;
                    const iframe = node.querySelector("iframe");
                    if (!iframe)
                        continue;
                    const iframeBody = iframe?.contentWindow?.document.body;
                    if (!iframeBody)
                        continue;
                    const promotional = iframeBody.querySelector("[data-click-to-action-url*='/premium-promotional-offer-terms']");
                    if (!promotional)
                        continue;
                    node.remove();
                }
            }
        });
        for (const node of nodeList) {
            observer.observe(node, { childList: true });
        }
    };
    const enableExperimentalFeatures = async () => {
        try {
            const expFeatures = JSON.parse(localStorage.getItem("spicetify-exp-features") || "{}");
            if (typeof expFeatures?.enableEsperantoMigration?.value !== "undefined")
                expFeatures.enableEsperantoMigration.value = true;
            if (typeof expFeatures?.enableInAppMessaging?.value !== "undefined")
                expFeatures.enableInAppMessaging.value = false;
            if (typeof expFeatures?.hideUpgradeCTA?.value !== "undefined")
                expFeatures.hideUpgradeCTA.value = true;
            // if (typeof expFeatures?.enableSmartShuffle?.value !== "undefined") expFeatures.enableSmartShuffle.value = false;
            localStorage.setItem("spicetify-exp-features", JSON.stringify(expFeatures));
            const overrides = {
                enableEsperantoMigration: true,
                enableInAppMessaging: false,
                hideUpgradeCTA: true,
                //enableSmartShuffle: false,
            };
            const map = createInternalMap(overrides);
            RemoteConfigResolver.value.setOverrides(map);
        }
        catch (error) {
            console.error("adblockify: Failed inside `enableExperimentalFeatures` function\n", error);
        }
    };
    bindToSlots();
    hideAdLikeElements();
    // to enable one day if disabling `enableInAppMessages` exp feature doesn't work
    //runObserver();
    productState.subValues({ keys: ["ads", "catalogue", "product", "type"] }, () => configureAdManagers());
    enableExperimentalFeatures();
    setTimeout(enableExperimentalFeatures, 3 * 1000);
    // Update slot settings after 5 seconds... idk why, don't ask me why, it just works
    setTimeout(intervalUpdateSlotSettings, 5 * 1000);
})();
