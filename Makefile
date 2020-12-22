publish:
	rsync -vaxe ssh . spicausis.lv:/services/web/spicausis.lv/arv/ --exclude .git --exclude Makefile
