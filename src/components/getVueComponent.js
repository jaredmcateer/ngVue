import angular from 'angular'
import Vue from 'vue'
import { isCompositionApi } from '../../lib/isCompositionApi'

export default function getVueComponent(component, $injector) {
  if (angular.isFunction(component)) {
    return component
  } else if (isCompositionApi(component)) {
    return Vue.component(component.name || 'UnnamedComponent', component)
  }
  return $injector.get(component)
}
