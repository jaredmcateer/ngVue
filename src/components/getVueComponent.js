import angular from 'angular'
import Vue from 'vue'
import { isCompositionApi } from '../../lib/isCompositionApi'

export default function getVueComponent(component, $injector) {
  if (angular.isFunction(component)) {
    return component
  } else if (isCompositionApi(component)) {
    const n = component.name || 'UnnamedComponent'
    return Vue.component(n, component)
  }
  return $injector.get(component)
}
