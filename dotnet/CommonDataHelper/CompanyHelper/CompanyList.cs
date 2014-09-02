using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDataHelper.EndpointHelper.Model;
using System.Net;
using CommonDataHelper.CompanyHelper.Model;

namespace CommonDataHelper.CompanyHelper
{
    public class CompanyList
    {
        public List<CompanyItem> createCompanyList(EndpointModel endpointModel, out HttpStatusCode httpStatusCode)
        {
            StringBuilder page = new StringBuilder(BaseUrlHelper.BaseUrl.ToString());
            page.Append(@"sdata/");
            page.Append(endpointModel.application);
            page.Append(@"/");
            page.Append(endpointModel.contract);
            page.Append(@"/");
            page.Append(endpointModel.dataset);
            page.Append(@"/COMPANY?representation=COMPANY.$lookup");

            List<CompanyItem> companyList = new List<CompanyItem>();
            WebHelper webHelper = new WebHelper();

            string responseJson = webHelper.getServerJson(page.ToString(), out httpStatusCode);
            if (httpStatusCode == HttpStatusCode.InternalServerError)
            {
                return null;
            }

            if (httpStatusCode == HttpStatusCode.OK && !string.IsNullOrEmpty(responseJson))
            {
                /*
                 * No company is chosen by default, so add a blank entry to facilitate this.
                 */
                companyList.Add(new CompanyItem(String.Empty, String.Empty));

                var companys = Newtonsoft.Json.JsonConvert.DeserializeObject<CompanysModel>(responseJson);

                foreach (CompanyModel company in companys.companies)
                {
                    companyList.Add(new CompanyItem(company.description, company.uuid));
                }
            }
            return companyList;
        }
    }
}
