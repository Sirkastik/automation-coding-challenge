import { Component, OnInit } from '@angular/core';

const USER_SELECTED_CLASSNAME = 'user-selected';

const ALGO_SELECTED_CLASSNAME = 'algo-selected';

const RESERVED_CLASSNAMES = [USER_SELECTED_CLASSNAME, ALGO_SELECTED_CLASSNAME];

const MAIN_CONTENT_SELECTOR = '#app>:first-child';

const CLICK_ACTION = 'click' as const;

const INPUT_ACTION = 'input' as const;

type SubAction = typeof CLICK_ACTION | typeof INPUT_ACTION;

@Component({
  selector: 'app-automator',
  templateUrl: './automator.component.html',
  styleUrls: ['./automator.component.css'],
})
export class AutomatorComponent implements OnInit {
  step: 1 | 2 | 3 = 1;

  subAction: SubAction | '' = '';

  inputValue = '';

  ngOnInit(): void {
    // listen for clicks in the DOM
    document
      .querySelector(MAIN_CONTENT_SELECTOR)
      ?.addEventListener('click', (e) =>
        this.selectElement(e.target as Element)
      );
  }

  parentElements: Element[] = [];

  childElements: Element[] = [];

  get isClickSubAction() {
    return this.subAction === CLICK_ACTION;
  }

  get isInputSubAction() {
    return this.subAction === INPUT_ACTION;
  }

  get selectedParentsCount() {
    return this.parentElements.length;
  }

  get predictedParentsCount() {
    return this.selectedParentsCount - 2;
  }

  get selectedElements() {
    return this.subAction ? this.childElements : this.parentElements;
  }

  get selectedClasses() {
    return [
      ...new Set(
        this.selectedElements.map((e) => e.className.split(' ')).flat()
      ),
    ]
      .filter((className) => !RESERVED_CLASSNAMES.includes(className))
      .filter((className) => {
        return this.selectedElements.every((el) => {
          return el.className.includes(className);
        });
      });
  }

  get selectedTagNames() {
    return [...new Set(this.selectedElements.map((e) => e.tagName))];
  }

  reset() {
    if (!this.subAction) {
      this.step = 1;
      this.parentElements.forEach((el) => this.clearSelectedClasses(el));
      this.parentElements = [];
    } else {
      this.step = 2;
      this.childElements.forEach((el) => this.clearSelectedClasses(el));
      this.childElements = [];
      this.subAction = '';
      this.inputValue = '';
    }
  }

  clearSelectedClasses(element: Element) {
    element.classList.remove(USER_SELECTED_CLASSNAME);
    element.classList.remove(ALGO_SELECTED_CLASSNAME);
  }

  isSubElement(element: Element) {
    return this.parentElements.some((el) => {
      return Array.from(el.childNodes).some((child) => child === element);
    });
  }

  selectElement(element: Element, userSelected = true) {
    if (this.step === 2) return; // disable selection in this step
    const index = this.selectedElements.findIndex((el) => el === element);
    if (index !== -1) {
      this.selectedElements.splice(index, 1);
      this.clearSelectedClasses(element);
      return; // deselect an element if was already selected
    }
    const childElements = this.selectedElements.filter((el) => {
      return Array.from(element.childNodes).some((child) => child === el);
    });
    childElements.forEach((el) => {
      this.clearSelectedClasses(el);
      const index = this.selectedElements.findIndex((e) => e === el);
      // deselect child element if parent is selected
      if (index !== -1) this.selectedElements.splice(index, 1);
    });

    // select element
    this.selectedElements.push(element);

    // add classnames for styling
    if (userSelected) element.classList.add(USER_SELECTED_CLASSNAME);
    else element.classList.add(ALGO_SELECTED_CLASSNAME);

    const shouldPredict =
      (this.subAction && this.selectedElements.length) ||
      this.selectedElements.length > 1;
    if (shouldPredict && userSelected) this.predictSimilar();
  }

  predictByClassName() {
    if (!this.selectedClasses.length) return true;
    const similar = document
      .querySelector(MAIN_CONTENT_SELECTOR)!
      .querySelectorAll(this.selectedClasses.map((c) => `.${c}`).join(''));
    if (similar.length <= this.selectedElements.length) return true;
    similar.forEach((el) => {
      if (this.selectedElements.find((e) => e === el)) return;
      if (this.subAction && !this.isSubElement(el)) return;
      this.selectElement(el, false);
    });
    return false;
  }

  predictByTagName() {
    if (this.selectedTagNames.length !== 1) return true;
    const similar = document
      .querySelector(MAIN_CONTENT_SELECTOR)!
      .getElementsByTagName(this.selectedTagNames[0]);
    if (similar.length <= this.selectedElements.length) return true;
    Array.from(similar).forEach((el) => {
      if (this.selectedElements.find((e) => e === el)) return;
      if (this.subAction && !this.isSubElement(el)) return;
      this.selectElement(el, false);
    });
    return false;
  }

  predictSimilar() {
    let continueSearch = this.predictByClassName();
    if (!continueSearch) return;
    continueSearch = this.predictByTagName();
    if (!continueSearch) return;
    // todo: add complex searches
  }

  runBot() {
    this.childElements.forEach((el) => {
      setTimeout(() => {
        if (this.subAction === 'click') (el as HTMLButtonElement).click();
        if (this.subAction === 'input')
          (el as HTMLInputElement).value = this.inputValue;
      }, 100);
    });
  }
}
