var previous = null;
var mainCategory = null;
var onFinishScroll = null;
function finishScrolling() {
	document.querySelectorAll(".accordion-collapse").forEach( item => { if (item != mainCategory) { item.bsCollapse.hide(); } } );
}
function markSection(entries) {
	entries.forEach((entry) => {
		if (entry.isIntersecting) {
			let tmp = document.querySelector("a[href='#" + entry.target.id + "']");
			tmp.classList.add('is-in-view');
			previous = tmp;
		} else {
			document.querySelector("a[href='#" + entry.target.id + "']").classList.remove('is-in-view');
		}
	});
	let first = document.querySelector('.is-in-view');
	if (!first) {
		first = previous;
	}
	document.querySelectorAll(".accordion-body > div > a").forEach( item => {if (item != first) { item.classList.remove('targeted'); }});
	if (first) {
		first.classList.add('targeted');
		mainCategory = first.closest('.accordion-collapse');
		if (!('show' in mainCategory.classList)) {
			mainCategory.bsCollapse.show();
		}
	}
}


function afterToc() {
	document.querySelectorAll(".accordion-collapse.collapse").forEach( item => {
		item.bsCollapse = new bootstrap.Collapse(item);
	});
	if ("IntersectionObserver" in window) {
		var tocObserver = new IntersectionObserver(markSection, {threshold: 1});
		document.querySelectorAll("h3").forEach((h3) => tocObserver.observe(h3));
	}
	window.addEventListener('scroll', function (event) {
		window.clearTimeout(onFinishScroll);
		onFinishScroll = setTimeout(finishScrolling, 100);
	}, false);
}
