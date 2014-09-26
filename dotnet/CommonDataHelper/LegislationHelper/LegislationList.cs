using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDataHelper.EndpointHelper.Model;
using System.Net;
using CommonDataHelper.LegislationHelper.Model;

namespace CommonDataHelper.LegislationHelper
{
    public class LegislationList
    {
        public List<LegislationItem> createLegislationList(EndpointModel endpointModel, out HttpStatusCode httpStatusCode)
        {
            StringBuilder page = new StringBuilder(BaseUrlHelper.BaseUrl.ToString());
            page.Append(@"sdata/");
            page.Append(endpointModel.application);
            page.Append(@"/");
            page.Append(endpointModel.contract);
            page.Append(@"/");
            page.Append(endpointModel.dataset);
            page.Append(@"/ATABDIV?representation=ATABDIV.$lookupcount=1000&where=(NUMTAB eq 909)");

            List<LegislationItem> legislationList = new List<LegislationItem>();
            WebHelper webHelper = new WebHelper();

            string responseJson = webHelper.getServerJson(page.ToString(), out httpStatusCode);
            if (httpStatusCode == HttpStatusCode.InternalServerError)
            {
                return null;
            }

            if (httpStatusCode == HttpStatusCode.OK && !string.IsNullOrEmpty(responseJson))
            {
                /*
                 * No Legislation is chosen by default, so add a blank entry to facilitate this.
                 */
                legislationList.Add(new LegislationItem(String.Empty, String.Empty));

                var legislations = Newtonsoft.Json.JsonConvert.DeserializeObject<LegislationsModel>(responseJson);

                foreach (LegislationModel legislation in legislations.legislations)
                {
                    legislationList.Add(new LegislationItem(legislation.description, legislation.code));
                }
            }
            return legislationList;
        }
    }
}
