using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using CommonDataHelper.ActivityCodeHelper;
using CommonDataHelper.ActivityCodeHelper.Model;

namespace CommonDataHelper
{
    public class ActivityCodeList
    {
        public List<ActivityCodeItem> createActivityCodeList(string endpoint)
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            StringBuilder page = new StringBuilder (baseUrl.ToString());
            page.Append(@"sdata/x3/erp/");
            page.Append(endpoint); // X3TESTV7
            page.Append(@"/$prototypes('ACTIV.$lookup')");
            
            List<ActivityCodeItem> activityCodeList = new List<ActivityCodeItem>();
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
