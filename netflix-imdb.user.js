// ==UserScript==
// @name         Netflix IMDB Ratings
// @version      1.14
// @description  Show IMDB ratings on Netflix
// @author       DK
// @match        https://www.netflix.com/*
// @grant        GM_xmlhttpRequest
// @connect      imdb.com
// ==/UserScript==

(function () {
    "use strict";

    var domParser = new DOMParser();

    const request = (url) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: e => resolve(e),
                onerror: reject,
                ontimeout: reject,
            });
        });
    }

    async function getRatingNode(title) {
        // console.log("requestRating", title);
        try {
            const searchRes = await request("https://www.imdb.com/find?s=tt&q=" + title);
            var searchResParsed = domParser.parseFromString(searchRes.responseText, "text/html");
            var titleEndpoint = searchResParsed.querySelector(".result_text > a").getAttribute("href");
            const titleRes = await request("https://www.imdb.com" + titleEndpoint);
            var titleResParsed = domParser.parseFromString(titleRes.responseText, "text/html");
            var imdbRating = titleResParsed.querySelector("div[data-testid] div.ipc-button__text");
            var rating = imdbRating && imdbRating.getElementsByTagName("span")[0].innerText;

            var ratingNode = document.createElement("div");
            ratingNode.classList.add("imdb-overlay")
            var imdbLabel = document.createElement("span");
            imdbLabel.classList.add("imdbTitle")
            imdbLabel.innerHTML = title || "IMDB";
            ratingNode.appendChild(imdbLabel);
            var score = document.createElement("span");
            score.classList.add("imdbScore");
            if (parseFloat(rating) > 7) { score.classList.add("red") };
            score.innerHTML = rating;
            ratingNode.appendChild(score);
            return ratingNode
        } catch (error) {
            console.log("error for", title, { error });
        }
    }

    var rootElement = document.getElementById("appMountPoint");

    if (!rootElement) return;

    async function imdbRenderingForCard(node) {
        var title = node.getElementsByTagName("a")[0]?.getAttribute("aria-label");
        if (!title) return;
        var ratingNode = await getRatingNode(title);
        node.prepend(ratingNode);
    }

    async function imdbRenderingForTrailer(node) {
        var titleNode = node.querySelector(".title-logo");
        var title = titleNode && titleNode.getAttribute("alt");
        var ratingNode = await getRatingNode(title);
        titleNode.parentNode.insertBefore(ratingNode, titleNode.nextSibling);
    }


    var observerCallback = function (mutationsList) {
        mutationsList.forEach(record => {
            record.target.classList.contains("lolomo") && [...record.addedNodes].map(i => {
                i.querySelector(".slider-item") && [...i.querySelectorAll(".slider-item")].map(item => {
                    !item.querySelector(".imdb-overlay") && imdbRenderingForCard(item)
                })
            });

            [...record.addedNodes].map(i => {
                i.classList.contains("slider-item") && imdbRenderingForCard(i)
            })

        });
    };

    var observer = new MutationObserver(observerCallback);

    var observerConfig = { childList: true, subtree: true };

    observer.observe(document, observerConfig);

    let styl = document.createElement("style")
    let head = document.getElementsByTagName("head")[0];
    styl.innerHTML = `
    div.imdb-overlay {
        background: linear-gradient(45deg, #000000cc 79%, #f5c518ff 80%);
        color: #ccc;
        border-radius: 3px;
        font-size: 10px;
        display: flex;
        position: relative;
        padding: 3px 10px;
        margin-bottom: -18px;
        justify-content: space-between;
        z-index: 109;
    }
    span.imdbTitle {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 80%;
    }
    span.imdbScore {
        font-size: 12px;
        line-height: 12px;
        color: #222;
        font-weight: 900;
    }
    .red {
        color: #860000 !important;
    }
    `;
    head.append(styl);

    var existingTrailer = document.querySelector(".billboard-row");
    existingTrailer && imdbRenderingForTrailer(existingTrailer);

    var existingCards = document.getElementsByClassName("slider-item");
    existingCards && [...existingCards].forEach(card => imdbRenderingForCard(card));

    window.addEventListener("beforeunload", function () {
        observer.disconnect();
    });
})();
