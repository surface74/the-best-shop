import { ProductProjection } from '@commercetools/platform-sdk';
import ProductApi from '../../../../api/products-api';
import TagName from '../../../../enum/tag-name';
import TagElement from '../../../../utils/create-tag-element';
import { ElementParams } from '../../../../utils/element-creator';
import Router from '../../../router/router';
import ProductCard from '../../../shared/product-card/product-card';
import DefaultView from '../../default-view';
import styleCss from './catalog-view.module.scss';
import ErrorMessage from '../../../message/error-message';
import Filter from './filter/filter';
import Observer from '../../../../observer/observer';
import EventName from '../../../../enum/event-name';
import SortView from './sort/sort';
import SearchInput from '../../../shared/search-input/search-input';
import WarningMessage from '../../../message/warning-message';
import QueryParamType from '../../../../api/sdk/type';

export default class CatalogView extends DefaultView {
  private readonly LANG = 'en-US';

  private readonly COUNTRY = 'US';

  private readonly NOT_FOUND = 'Products not found';

  private router: Router;

  private cardsWrapper: HTMLDivElement;

  private controlsWrapper: HTMLDivElement;

  private productApi = new ProductApi();

  private filter: Filter;

  private search: SearchInput;

  private sorting: SortView;

  private observer = Observer.getInstance();

  constructor(router: Router) {
    const params: ElementParams = {
      tag: TagName.SECTION,
      classNames: [styleCss['catalog-view']],
      textContent: '',
    };
    super(params);

    this.filter = new Filter(this.productApi);

    this.search = new SearchInput(this.getSearchProducts.bind(this));

    this.sorting = new SortView();

    this.router = router;

    this.observer.subscribe(EventName.UPDATE_CATALOG_CARDS, this.recallProductCards.bind(this));

    this.controlsWrapper = new TagElement().createTagElement('div', [styleCss['controls-wrapper']]);

    this.cardsWrapper = new TagElement().createTagElement('div', [styleCss['content-wrapper']]);

    this.getCreator().addInnerElement(this.cardsWrapper);

    this.configView();
  }

  private recallProductCards() {
    this.search.clear();
    this.getProducts();
  }

  private getCategories() {
    this.productApi.getCategories().then((response) => response);
  }

  private configView() {
    const filterHeader = this.filter.getFilterHeaderElement();
    const sortingElement = this.sorting.getElement();

    this.controlsWrapper.append(filterHeader, this.search.getElement(), sortingElement);
    this.getElement().append(this.controlsWrapper, this.cardsWrapper);
    this.getProducts();
  }

  private getSearchProducts() {
    const searchString = this.search.getSearchString();

    if (!searchString) {
      this.getProducts();
    } else {
      const params = this.getSearchQueryParams(searchString);
      this.productApi
        .getProducts(params)
        .then((response) => {
          const products = response.body.results;
          if (products.length) {
            this.filter.clearFilters();
            this.createProductCards(products);
          } else {
            new WarningMessage().showMessage(this.NOT_FOUND);
          }
        })
        .catch((error) => new ErrorMessage().showMessage(error.message));
    }
  }

  private getProducts() {
    const params: QueryParamType = this.getQueryParams();

    this.productApi
      .getProducts(params)
      .then((response) => {
        const products = response.body.results;
        this.createProductCards(products);

        if (!products.length) {
          new WarningMessage().showMessage(this.NOT_FOUND);
        }
      })
      .catch((error) => new ErrorMessage().showMessage(error.message));
  }

  private getQueryParams(): QueryParamType {
    const params: QueryParamType = {
      fuzzy: false,
      priceCountry: 'US',
      priceCurrency: 'USD',
      markMatchingVariants: true,
      sort: this.sorting.getSortCondition(),
    };

    const filter = this.filter.getFilterCondition();
    if (filter.length) {
      params.filter = filter;
    }
    const sortOrder = this.sorting.getSortCondition();
    if (sortOrder) {
      params.sort = sortOrder;
    }

    return params;
  }

  private getSearchQueryParams(searchString: string): QueryParamType {
    const params: QueryParamType = {
      'text.en': searchString,
      fuzzy: true,
      priceCountry: 'US',
      priceCurrency: 'USD',
      markMatchingVariants: true,
    };
    return params;
  }

  private createProductCards(products: ProductProjection[]) {
    this.cardsWrapper.replaceChildren('');
    products.forEach((product) => {
      if (product.key) {
        const card = new ProductCard(product, this.router);
        this.cardsWrapper.append(card.getElement());
      }
    });
  }
}