import api from './index'

export const pagesApi = {
  getPage(type: string, locale: string = 'zh') {
    return api.get(`/pages/${type}`, { params: { locale } })
  },
  getAllPages() {
    return api.get('/pages')
  },
  updatePage(data: any) {
    return api.patch('/pages', data)
  },
}
