using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using CommonDataHelper.EndpointHelper;
using CommonDataHelper.EndpointHelper.Model;

namespace CommonDataHelper
{
    public class EndpointList
    {
        public List<EndpointItem> createEndpointList(string templateClass, string trackingId)
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            StringBuilder page = new StringBuilder (baseUrl.ToString());
            page.Append(@"sdata/syracuse/collaboration/syracuse/endPoints?representation=endPoint.$lookup");
            page.Append(@"&role=");
            page.Append(CookieHelper.Role);
            page.Append(@"&trackingId=");
            page.Append(trackingId);
            page.Append(@"&binding=endpoint&count=1000");
            
            List<EndpointItem> endpointList = new List<EndpointItem>();
            WebHelper cd = new WebHelper();

            HttpStatusCode httpStatusCode;
            string responseJson = cd.getServerJson(page.ToString(), out httpStatusCode);
            if (httpStatusCode == HttpStatusCode.InternalServerError)
            {
                return null;
            }

            if (httpStatusCode == HttpStatusCode.OK && responseJson != null)
            {
                /*
                 * No endpoint is chosen by default, so add a blank entry to facilitate this.
                 */
                endpointList.Add(new EndpointItem(String.Empty, String.Empty));

                var endpoints = Newtonsoft.Json.JsonConvert.DeserializeObject<EndpointsLookupModel>(responseJson);

                foreach (EndpointLookupModel endpoint in endpoints.endpoints)
                {
                    endpointList.Add(new EndpointItem(endpoint.description, endpoint.uuid));
                }
            }
            return endpointList;
        }
    }
}
