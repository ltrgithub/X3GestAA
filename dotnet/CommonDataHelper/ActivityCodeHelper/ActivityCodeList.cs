using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using CommonDataHelper.ActivityCodeHelper;
using CommonDataHelper.ActivityCodeHelper.Model;
using CommonDataHelper.EndpointHelper.Model;

namespace CommonDataHelper
{
    public class ActivityCodeList
    {
        public List<ActivityCodeItem> createActivityCodeList(EndpointModel endpointModel, out HttpStatusCode httpStatusCode)
        {
            StringBuilder page = new StringBuilder(BaseUrlHelper.BaseUrl.ToString());
            page.Append(@"sdata/");
            page.Append(endpointModel.application);
            page.Append(@"/");
            page.Append(endpointModel.contract);
            page.Append(@"/");
            page.Append(endpointModel.dataset);
            page.Append(@"/ACTIV?representation=ACTIV.$lookup");
            
            List<ActivityCodeItem> activityCodeList = new List<ActivityCodeItem>();
            WebHelper webHelper = new WebHelper();

            string responseJson = webHelper.getServerJson(page.ToString(), out httpStatusCode);
            if (httpStatusCode == HttpStatusCode.InternalServerError)
            {
                return null;
            }

            if (httpStatusCode == HttpStatusCode.OK && !string.IsNullOrEmpty(responseJson))
            {
                /*
                 * No activityCode is chosen by default, so add a blank entry to facilitate this.
                 */
                activityCodeList.Add(new ActivityCodeItem(String.Empty, String.Empty));

                var activityCodes = Newtonsoft.Json.JsonConvert.DeserializeObject<ActivityCodesModel>(responseJson);

                foreach (ActivityCodeModel activityCode in activityCodes.activityCodes)
                {
                    activityCodeList.Add(new ActivityCodeItem(activityCode.description, activityCode.uuid));
                }
            }
            return activityCodeList;
        }
    }
}
