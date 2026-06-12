LATEXMK = latexmk -pdf -interaction=nonstopmode -halt-on-error
AUX = $(CURDIR)/.build

.PHONY: check pdfs survey contribution paper clean

check:
	python3 scripts/check.py

survey:
	$(LATEXMK) -cd -auxdir=$(AUX)/survey survey/survey.tex

contribution:
	@test -n "$(C)" || { echo "usage: make contribution C=<slug>"; exit 1; }
	$(LATEXMK) -cd -auxdir=$(AUX)/contribution-$(C) contributions/$(C)/report/report.tex

paper:
	@test -n "$(P)" || { echo "usage: make paper P=<slug>"; exit 1; }
	$(LATEXMK) -cd -auxdir=$(AUX)/paper-$(P) papers/$(P)/manuscript/main.tex

pdfs: survey
	@for t in contributions/*/report/report.tex papers/*/manuscript/main.tex; do \
		[ -e "$$t" ] || continue; \
		case "$$t" in */_template/*) continue;; esac; \
		$(LATEXMK) -cd -auxdir=$(AUX)/$$(echo "$$t" | tr / -) "$$t"; \
	done

clean:
	rm -rf .build
