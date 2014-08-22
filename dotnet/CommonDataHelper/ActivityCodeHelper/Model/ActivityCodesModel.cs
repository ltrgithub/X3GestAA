using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.ActivityCodeHelper.Model
{
    public class ActivityCodesModel
    {
        [JsonProperty("$resources")]
        public List<ActivityCodeModel> activityCodes { get; set; }
    }
}
