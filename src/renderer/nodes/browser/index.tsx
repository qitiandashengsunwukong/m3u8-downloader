import React, { FC, useEffect, useRef, useState } from "react";
import "./index.scss";
import { Spin } from "antd";
import tdApp from "renderer/utils/td";
import "antd/dist/antd.css";
import { insertFav, isFavFunc, removeFav } from "renderer/utils/localforge";
import WindowToolBar from "renderer/components/WindowToolBar";
import SearchBar from "./elements/SearchBar";
import onEvent from "renderer/utils/td-utils";
import electron from "renderer/utils/electron";

tdApp.init();

const computeRect = ({
  left,
  top,
  width,
  height,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
}) => ({
  x: Math.floor(left),
  y: Math.floor(top),
  width: Math.floor(width),
  height: Math.floor(height),
});

const BrowserWindow: FC = () => {
  const [url, setUrl] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [isFav, setIsFav] = useState<boolean>(false);
  const webviewRef = useRef<HTMLDivElement>();
  const resizeObserver = useRef<ResizeObserver>();

  useEffect(() => {
    initWebView();
    window.electron.addEventListener("dom-ready", handleViewDOMReady);

    return () => {
      window.electron.setBrowserViewRect({ x: 0, y: 0, height: 0, width: 0 });
      window.electron.removeEventListener("dom-ready", handleViewDOMReady);
      resizeObserver.current?.disconnect();
    };
  }, []);

  const handleViewDOMReady = async (
    e: Electron.IpcRendererEvent,
    { url, title }: { url: string; title: string }
  ): Promise<void> => {
    const isFav = await isFavFunc(url);
    setUrl(url);
    setTitle(title);
    setIsFav(isFav);
    document.title = title;
  };

  const initWebView = () => {
    if (webviewRef.current) {
      const rect = computeRect(webviewRef.current.getBoundingClientRect());
      window.electron.setBrowserViewRect(rect);

      // 监控 webview 元素的大小
      resizeObserver.current = new ResizeObserver((entries) => {
        const entry = entries[0];
        const viewRect = computeRect(entry.contentRect);
        viewRect.x += rect.x;
        viewRect.y += rect.y;
        window.electron.setBrowserViewRect(viewRect);
      });

      resizeObserver.current.observe(webviewRef.current);
    }
  };

  const onGoBack = () => {
    onEvent.browserPageGoBack();
    electron.browserViewGoBack();
  };

  const onReload = () => {
    onEvent.browserPageReload();
    electron.browserViewReload();
  };

  const onGoBackHome = () => {
    electron.browserViewLoadURL();
  };

  const onUrlChange = (url: string) => {
    setUrl(url);
  };

  const handleEnter = () => {
    electron.browserViewLoadURL(url);
  };

  const handleClickFav = async () => {
    const isFav = await isFavFunc(url);
    if (isFav) {
      await removeFav({ title, url });
    } else {
      await insertFav({ title, url });
    }
    setIsFav((fav) => !fav);
  };

  return (
    <div className="browser-window">
      <WindowToolBar
        onClose={() => {
          window.electron.closeBrowserWindow();
        }}
      >
        {title}
      </WindowToolBar>
      <div className="webview-container">
        <SearchBar
          className="webview-nav"
          url={url}
          isFav={isFav}
          onUrlChange={onUrlChange}
          onGoBack={onGoBack}
          onReload={onReload}
          onGoBackHome={onGoBackHome}
          handleEnter={handleEnter}
          handleClickFav={handleClickFav}
        />
        <div className="webview-inner">
          <div id="videoView" ref={webviewRef as any}>
            <Spin />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserWindow;
