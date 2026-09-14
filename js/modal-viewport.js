(function () {
    function updateModalViewport() {
        const viewport = window.visualViewport;
        const root = document.documentElement;
        root.style.setProperty('--modal-viewport-height', `${viewport ? viewport.height : window.innerHeight}px`);
        root.style.setProperty('--modal-viewport-top', `${viewport ? viewport.offsetTop : 0}px`);
    }
    updateModalViewport();
    window.addEventListener('resize', updateModalViewport);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateModalViewport);
        window.visualViewport.addEventListener('scroll', updateModalViewport);
    }
})();
